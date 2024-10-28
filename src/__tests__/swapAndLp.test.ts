import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { BigNumber } from 'ethers';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { describe, expect, it } from 'vitest';
import { formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';
import { toHuman } from '@acala-network/asset-router/dist/utils';

import {
  JITOSOL_ADDR,
  JITOSOL_DECIMALS,
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
} from './testConsts';
import { SwapAndLpParams } from '../utils';
import {
  api,
  expectError,
  provider,
  relayer,
  sudoTransferToken,
  transferToken,
  user,
} from './testUtils';

const recipient = TEST_ADDR_USER;
const poolId = '7';
const swapAmount = parseUnits('0.12', JITOSOL_DECIMALS).toString();
const minShareAmount = '0';

describe.concurrent('/shouldRouteSwapAndLp', () => {
  const testShouldRouteSwapAndLp = async (params: SwapAndLpParams) => {
    let res = await api.shouldRouteSwapAndLp(params);
    expect(res).toMatchSnapshot();

    // should be case insensitive
    res = await api.shouldRouteSwapAndLp({
      ...params,
      recipient: params.recipient.toLowerCase(),
    });
    expect(res).toMatchSnapshot();
  };

  it('when should route', async () => {
    await testShouldRouteSwapAndLp({
      recipient,
      poolId,
      swapAmount,
      minShareAmount,
    });
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await api.shouldRouteSwapAndLp({
          recipient,
          poolId,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['swapAmount is a required field'], 400);
      }

      try {
        await api.shouldRouteSwapAndLp({
          recipient,
          swapAmount,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['poolId is a required field'], 400);
      }

      try {
        await api.shouldRouteSwapAndLp({
          poolId,
          swapAmount,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['recipient is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await api.shouldRouteSwapAndLp({
        recipient,
        poolId: '999',
        swapAmount,
        minShareAmount,
      });
      expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "msg": "euphrates poolId 999 is not supported",
            "shouldRoute": false,
          },
        }
      `);
    });
  });
});

describe('route and rescue', () => {
  let routerAddr: string;
  const jitosol = ERC20__factory.connect(JITOSOL_ADDR, relayer);

  const fetchTokenBalances = async () => {
    if (!routerAddr) throw new Error('routerAddr not set');

    const [
      userBal,
      userTokenBal,
      relayerTokenBal,
      routerTokenBal,
    ] = await Promise.all([
      provider.getBalance(TEST_ADDR_USER),
      jitosol.balanceOf(TEST_ADDR_USER),
      jitosol.balanceOf(TEST_ADDR_RELAYER),
      jitosol.balanceOf(routerAddr),
    ]);

    console.log({
      userBal: toHuman(userBal, 18),
      userTokenBal: toHuman(userTokenBal, JITOSOL_DECIMALS),
      relayerTokenBal: toHuman(relayerTokenBal, JITOSOL_DECIMALS),
      routerTokenBal: toHuman(routerTokenBal, JITOSOL_DECIMALS),
    });

    return {
      userBal,
      userTokenBal,
      relayerTokenBal,
      routerTokenBal,
    };
  };

  it('/routeSwapAndLp', async () => {
    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      poolId,
      swapAmount,
      minShareAmount,
    };

    const shouldRouteRes = await api.shouldRouteSwapAndLp(routeArgs);
    ({ routerAddr } = shouldRouteRes.data);
    console.log({ routerAddr });

    // make sure user has enough token to transfer to router
    const bal = await fetchTokenBalances();
    const trasnferAmount = BigNumber.from(swapAmount).mul(2);
    if (bal.userTokenBal.lt(trasnferAmount)) {
      if (bal.relayerTokenBal.lt(trasnferAmount)) {
        throw new Error('both relayer and user do not have enough jitosol to transfer to router!');
      }

      console.log('refilling token for user ...');
      await (await jitosol.transfer(TEST_ADDR_USER, trasnferAmount)).wait();
    }

    console.log('transferring token to router ...');
    const transferAmountHuman = Number(formatUnits(trasnferAmount, JITOSOL_DECIMALS));
    await transferToken(routerAddr, user, JITOSOL_ADDR, transferAmountHuman);

    const bal0 = await fetchTokenBalances();

    console.log('routing ...');
    const routeRes = await api.routeSwapAndLp({
      ...routeArgs,
      token: JITOSOL_ADDR,
    });
    const { txHash, removed } = routeRes.data;
    console.log(`route finished! txHash: ${txHash}, removed: ${removed}`);

    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerTokenBal.toNumber()).to.eq(0);

    // relayer should receive routing fee and swap fee
    const routingFee = await FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider)
      .getFee(JITOSOL_ADDR);
    const swapFee = parseUnits('0.0035', 9);
    expect(bal1.relayerTokenBal.sub(bal0.relayerTokenBal).toBigInt())
      .to.eq(routingFee.add(swapFee).toBigInt());

    // user should receive 3 ACA drop
    expect(bal1.userBal.sub(bal0.userBal).toBigInt()).to.eq(parseEther('3').toBigInt());
  });

  it('/rescueSwapAndLp', async () => {
    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      poolId,
      swapAmount,
      minShareAmount,
    };

    const shouldRouteRes = await api.shouldRouteSwapAndLp(routeArgs);
    ({ routerAddr } = shouldRouteRes.data);
    console.log({ routerAddr });

    // make sure user has enough token to transfer to router
    const bal = await fetchTokenBalances();
    const trasnferAmount = BigNumber.from(swapAmount).mul(2);
    if (bal.userTokenBal.lt(trasnferAmount)) {
      if (bal.relayerTokenBal.lt(trasnferAmount)) {
        throw new Error('both relayer and user do not have enough jitosol to transfer to router!');
      }

      console.log('refilling token for user ...');
      await (await jitosol.transfer(TEST_ADDR_USER, trasnferAmount)).wait();
    }

    console.log('transferring token to router ...');
    const transferAmountHuman = Number(formatUnits(trasnferAmount, JITOSOL_DECIMALS));
    await transferToken(routerAddr, user, JITOSOL_ADDR, transferAmountHuman);

    const bal0 = await fetchTokenBalances();

    console.log('rescuing ...');
    const rescueRes = await api.rescueSwapAndLp({
      ...routeArgs,
      token: JITOSOL_ADDR,
    });
    const txHash = rescueRes.data;
    console.log(`rescue finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerTokenBal.toNumber()).to.eq(0);

    // relayer should receive swap fee
    const swapFee = parseUnits('0.0035', 9);
    expect(bal1.relayerTokenBal.sub(bal0.relayerTokenBal).toBigInt()).to.eq(swapFee.toBigInt());

    // user should receive 3 ACA drop and token back
    expect(bal1.userBal.sub(bal0.userBal).toBigInt()).to.eq(parseEther('3').toBigInt());
    expect(bal1.userTokenBal.sub(bal0.userTokenBal).toBigInt())
      .to.eq(trasnferAmount.sub(swapFee).toBigInt());
  });
});


