import { ADDRESSES, ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { DOT, LCDOT_13 as LCDOT, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { HOMA } from '@acala-network/contracts/utils/Predeploy';
import { IHoma__factory } from '@acala-network/contracts/typechain';
import { ONE_ACA, almostEq, toHuman } from '@acala-network/asset-router/dist/utils';
import { BigNumber, Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { formatEther, formatUnits, parseEther, parseUnits } from 'ethers/lib/utils';

import { ETH_RPC, EUPHRATES_ADDR, EUPHRATES_POOLS, SWAP_SUPPLY_TOKENS } from '../consts';
import { SwapAndLpParams } from '../utils';
import {
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  expectError,
  routerInfo,
  routeSwapAndLp,
  saveRouterInfo,
  shouldRouteSwapAndLp,
  transferToken,
} from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);
const user = new Wallet(TEST_KEY.USER, provider);

const JITOSOL_DECIMALS = 9;
const JITOSOL_ADDR = ROUTER_TOKEN_INFO.jitosol.acalaAddr;

const recipient = TEST_ADDR_USER;
const poolId = '7';
const swapAmount = parseUnits('0.5', JITOSOL_DECIMALS).toString();
const minShareAmount = '100';

describe.concurrent('/shouldRouteSwapAndLp', () => {
  const testShouldRouteSwapAndLp = async (params: SwapAndLpParams) => {
    let res = await shouldRouteSwapAndLp(params);
    expect(res).toMatchSnapshot();

    // should be case insensitive
    res = await shouldRouteSwapAndLp({
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
        await shouldRouteSwapAndLp({
          recipient,
          poolId,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['swapAmount is a required field'], 400);
      }

      try {
        await shouldRouteSwapAndLp({
          recipient,
          swapAmount,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['poolId is a required field'], 400);
      }

      try {
        await shouldRouteSwapAndLp({
          poolId,
          swapAmount,
          minShareAmount,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['recipient is a required field'], 400);
      }

      try {
        await shouldRouteSwapAndLp({
          poolId,
          swapAmount,
          recipient,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['minShareAmount is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await shouldRouteSwapAndLp({
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

describe('/routeSwapAndLp', () => {
  let routerAddr: string;
  const jitosol = ERC20__factory.connect(JITOSOL_ADDR, provider);

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

  it('works', async () => {
    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      poolId,
      swapAmount,
      minShareAmount,
    };
    const res = await shouldRouteSwapAndLp(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough token to transfer to router
    const bal = await fetchTokenBalances();
    if (bal.userTokenBal.lt(parseUnits(swapAmount, 18))) {
      if (bal.relayerTokenBal.lt(parseUnits(swapAmount, 18))) {
        throw new Error('both relayer and user do not have enough jitosol to transfer to router!');
      }

      console.log('refilling token for user ...');
      await (await jitosol.transfer(TEST_ADDR_USER, parseUnits(swapAmount, 18))).wait();
    }

    const bal0 = await fetchTokenBalances();

    console.log('transferring token to router ...');
    const transferAmount = Number(
      formatUnits(BigNumber.from(swapAmount).mul(2).toString(), JITOSOL_DECIMALS)
    );
    await transferToken(routerAddr, user, JITOSOL_ADDR, transferAmount);

    // record pending route
    let routerInfoRes = await routerInfo({ routerAddr });
    expect(routerInfoRes.data).toMatchInlineSnapshot();

    const saveRouteRes = await saveRouterInfo({
      params: JSON.stringify(routeArgs),
      recipient,
      routerAddr,
    });
    expect(saveRouteRes.data).toMatchInlineSnapshot();

    console.log('routing ...');
    const routeRes = await routeSwapAndLp({
      ...routeArgs,
      token: JITOSOL_ADDR,
    });
    const { txHash, removed } = routeRes.data;
    console.log(`route finished! txHash: ${txHash}, record removed: ${removed}`);

    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerTokenBal.toNumber()).to.eq(0);

    // relayer should receive token fee
    const routingFee = await FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider)
      .getFee(JITOSOL_ADDR);
    expect(bal1.relayerTokenBal.sub(bal0.relayerTokenBal).toBigInt()).to.eq(routingFee.toBigInt());

    // user should receive 3 ACA drop
    expect(bal1.userBal.sub(bal0.userBal).toBigInt()).to.eq(parseEther('3').toBigInt());

    // router info should be cleaned up
    routerInfoRes = await routerInfo({ routerAddr });
    expect(routerInfoRes.data).toMatchInlineSnapshot();
  });
});


