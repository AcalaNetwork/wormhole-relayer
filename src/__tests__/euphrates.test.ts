import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { DOT, LCDOT_13 as LCDOT, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { HOMA } from '@acala-network/contracts/utils/Predeploy';
import { IHoma__factory } from '@acala-network/contracts/typechain';
import { ONE_ACA, almostEq, toHuman } from '@acala-network/asset-router/dist/utils';
import { Wallet } from 'ethers';
import {  describe, expect, it } from 'vitest';
import { formatEther, parseEther, parseUnits } from 'ethers/lib/utils';

import { ETH_RPC, EUPHRATES_ADDR, EUPHRATES_POOLS } from '../consts';
import { RouteParamsEuphrates } from '../utils';
import {
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  api,
  expectError,
  transferToken,
} from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);   // 0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3
const user = new Wallet(TEST_KEY.USER, provider);         // 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6

// [inToken, outToken]
const WTDOT = '0xe1bd4306a178f86a9214c39abcd53d021bedb0f9';
const EUPHRAETS_POOL_INFO = {
  0: [LCDOT, LDOT],
  1: [LCDOT, WTDOT],
  2: [DOT, LDOT],
  3: [DOT, WTDOT],
};

describe.concurrent('/shouldRouteEuphrates', () => {
  const recipient = '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6';

  const testShouldRouteEuphrates = async (params: RouteParamsEuphrates) => {
    let res = await api.shouldRouteEuphrates(params);
    expect(res).toMatchSnapshot();

    // should be case insensitive
    res = await api.shouldRouteEuphrates({
      ...params,
      recipient: params.recipient.toLocaleLowerCase(),
    });
    expect(res).toMatchSnapshot();
  };

  it('when should route', async () => {
    for (const poolId of EUPHRATES_POOLS) {
      await testShouldRouteEuphrates({
        recipient,
        poolId,
      });
    }
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await api.shouldRouteEuphrates({
          recipient,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['poolId is a required field'], 400);
      }

      try {
        await api.shouldRouteEuphrates({
          poolId: 0,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['recipient is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await api.shouldRouteEuphrates({
        recipient,
        poolId: 520,
      });
      expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "msg": "euphrates poolId 520 is not supported",
            "shouldRoute": false,
          },
        }
      `);
    });
  });
});

describe('/routeEuphrates', () => {
  const DOT_DECIMALS = 10;
  const homa = IHoma__factory.connect(HOMA, provider);
  const fee = FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider);
  const stakeAmount = 6;
  const parsedStakeAmount = parseUnits(String(stakeAmount), DOT_DECIMALS);
  let routerAddr: string;

  const fetchTokenBalances = async (pooId: string) => {
    if (!routerAddr) throw new Error('routerAddr not set');

    const [inTokenAddr, outTokenAddr] = EUPHRAETS_POOL_INFO[pooId];
    const inToken = ERC20__factory.connect(inTokenAddr, provider);
    const outToken = ERC20__factory.connect(outTokenAddr, provider);

    const [
      userBalIn,
      relayerBalIn,
      routerBalIn,
      userBalOut,
      routerBalOut,
      euphratesBalOut,
    ] = await Promise.all([
      inToken.balanceOf(TEST_ADDR_USER),
      inToken.balanceOf(TEST_ADDR_RELAYER),
      inToken.balanceOf(routerAddr),
      outToken.balanceOf(TEST_ADDR_USER),
      outToken.balanceOf(routerAddr),
      outToken.balanceOf(EUPHRATES_ADDR),
    ]);

    console.log({
      userBalIn: toHuman(userBalIn, DOT_DECIMALS),
      relayerBalIn: toHuman(relayerBalIn, DOT_DECIMALS),
      routerBalIn: toHuman(routerBalIn, DOT_DECIMALS),
      userBalOut: toHuman(userBalOut, DOT_DECIMALS),
      routerBalOut: toHuman(routerBalOut, DOT_DECIMALS),
      euphratesBalOut: toHuman(euphratesBalOut, DOT_DECIMALS),
    });

    return {
      userBalIn,
      relayerBalIn,
      routerBalIn,
      userBalOut,
      routerBalOut,
      euphratesBalOut,
    };
  };

  const testEuphratesRouter = async (poolId: string) => {
    const [inTokenAddr] = EUPHRAETS_POOL_INFO[poolId];

    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      poolId,
    };
    const res = await api.shouldRouteEuphrates(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough DOT/LCDOT to transfer to router
    const bal = await fetchTokenBalances(poolId);
    if (bal.userBalIn.lt(parsedStakeAmount)) {
      if (bal.relayerBalIn.lt(parsedStakeAmount)) {
        throw new Error(`both relayer and user do not have enough ${inTokenAddr} to transfer to router!`);
      }

      console.log('refilling dot for user ...');
      const inToken = ERC20__factory.connect(inTokenAddr, relayer);
      await (await inToken.transfer(TEST_ADDR_USER, parsedStakeAmount)).wait();
    }

    const bal0 = await fetchTokenBalances(poolId);

    console.log('transferring token to router ...');
    await transferToken(routerAddr, user, inTokenAddr, stakeAmount);

    console.log('routing ...');
    const routeRes = await api.routeEuphrates({
      ...routeArgs,
      token: inTokenAddr,
    });
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances(poolId);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerBalIn.toNumber()).to.eq(0);

    // euphrate contract should receive Liquid Token
    const routingFee = await fee.getFee(inTokenAddr);
    const liquidTokenReceived = bal1.euphratesBalOut.sub(bal0.euphratesBalOut);

    if (['0', '2'].includes(poolId)) {
      // 10{18} DOT => ? LDOT
      const exchangeRate = parseEther(
        (1 / Number(formatEther(await homa.getExchangeRate()))).toString()
      );
      const liquidTokenExpected = parsedStakeAmount.sub(routingFee).mul(exchangeRate).div(ONE_ACA);
      expect(almostEq(liquidTokenExpected, liquidTokenReceived)).to.be.true;
    } else {
      // calculating exact tdot is out of scope of this test
      expect(liquidTokenReceived.toBigInt()).toBeGreaterThan(0);
    }
    expect(bal0.userBalIn.sub(bal1.userBalIn).toBigInt()).to.eq(parsedStakeAmount.toBigInt());

    // relayer should receive DOT/LCDOT fee
    expect(bal1.relayerBalIn.sub(bal0.relayerBalIn).toBigInt()).to.eq(routingFee.toBigInt());
  };

  it('worked for all pools', async () => {
    for (const poolId of EUPHRATES_POOLS.slice(0, 4)) {   // TODO: test pool 7
      await testEuphratesRouter(poolId);
    }
  });
});
