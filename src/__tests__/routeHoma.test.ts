import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { DOT, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { EVMAccounts__factory, IHoma__factory } from '@acala-network/contracts/typechain';
import { EVM_ACCOUNTS, HOMA } from '@acala-network/contracts/utils/Predeploy';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ONE_ACA, almostEq, toHuman } from '@acala-network/asset-router/dist/utils';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import assert from 'assert';

import { ETH_RPC } from '../consts';
import { RouteStatus } from '../api';
import {
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  mockXcmToRouter,
  routeHoma,
  routeHomaAuto,
  routeStatus,
  shouldRouteHoma,
} from './testUtils';

const providerAcalaFork = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayerAcalaFork = new Wallet(TEST_KEY.RELAYER, providerAcalaFork);
const userAcalaFork = new Wallet(TEST_KEY.USER, providerAcalaFork);

describe.skip('/routeHoma', () => {
  const DOT_DECIMALS = 10;
  const dot = ERC20__factory.connect(DOT, providerAcalaFork);
  const ldot = ERC20__factory.connect(LDOT, providerAcalaFork);
  const homa = IHoma__factory.connect(HOMA, providerAcalaFork);
  const evmAccounts = EVMAccounts__factory.connect(EVM_ACCOUNTS, providerAcalaFork);
  const fee = FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, providerAcalaFork);
  const stakeAmount = 6;
  const parsedStakeAmount = parseUnits(String(stakeAmount), DOT_DECIMALS);
  let routerAddr: string;

  const fetchTokenBalances = async () => {
    if (!routerAddr) throw new Error('routerAddr not set');

    const [
      userBalDot,
      relayerBalDot,
      routerBalDot,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    ] = await Promise.all([
      dot.balanceOf(TEST_ADDR_USER),
      dot.balanceOf(TEST_ADDR_RELAYER),
      dot.balanceOf(routerAddr),
      ldot.balanceOf(TEST_ADDR_USER),
      ldot.balanceOf(TEST_ADDR_RELAYER),
      ldot.balanceOf(routerAddr),
    ]);

    console.log({
      userBalDot: toHuman(userBalDot, DOT_DECIMALS),
      relayerBalDot: toHuman(relayerBalDot, DOT_DECIMALS),
      routerBalDot: toHuman(routerBalDot, DOT_DECIMALS),
      userBalLdot: toHuman(userBalLdot, DOT_DECIMALS),
      relayerBalLdot: toHuman(relayerBalLdot, DOT_DECIMALS),
      routerBalLdot: toHuman(routerBalLdot, DOT_DECIMALS),
    });

    return {
      userBalDot,
      relayerBalDot,
      routerBalDot,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    };
  };

  const testHomaRouter = async (destAddr: string) => {
    const relayerBal = await relayerAcalaFork.getBalance();
    assert(relayerBal.gt(parseEther('10')), `relayer doesn't have enough balance to relay! ${relayerAcalaFork.address}`);

    const routeArgs = {
      destAddr,
      chain: 'acala',
    };
    const res = await shouldRouteHoma(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough DOT to transfer to router
    const bal = await fetchTokenBalances();
    if (bal.userBalDot.lt(parsedStakeAmount)) {
      if (bal.relayerBalDot.lt(parsedStakeAmount)) {
        throw new Error('both relayer and user do not have enough DOT to transfer to router!');
      }

      console.log('refilling dot for user ...');
      await (await dot.connect(relayerAcalaFork).transfer(TEST_ADDR_USER, parsedStakeAmount)).wait();
    }

    const bal0 = await fetchTokenBalances();

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, userAcalaFork, DOT, stakeAmount);

    console.log('routing ...');
    const routeRes = await routeHoma({
      ...routeArgs,
      token: DOT,
    });
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await providerAcalaFork.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerBalDot.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // user should receive LDOT
    const routingFee = await fee.getFee(DOT);
    const exchangeRate = await homa.getExchangeRate();   // 10{18} LDOT => ? DOT
    const expectedLdot = parsedStakeAmount.sub(routingFee).mul(ONE_ACA).div(exchangeRate);
    const ldotReceived = bal1.userBalLdot.sub(bal0.userBalLdot);

    expect(almostEq(expectedLdot, ldotReceived)).to.be.true;
    expect(bal0.userBalDot.sub(bal1.userBalDot).toBigInt()).to.eq(parsedStakeAmount.toBigInt());

    // relayer should receive DOT fee
    expect(bal1.relayerBalDot.sub(bal0.relayerBalDot).toBigInt()).to.eq(routingFee.toBigInt());
  };

  const testAutoHomaRouter = async (destAddr: string) => {
    const relayerBal = await relayerAcalaFork.getBalance();
    assert(relayerBal.gt(parseEther('10')), `relayer doesn't have enough balance to relay! ${relayerAcalaFork.address}`);

    const routeArgs = {
      destAddr,
      chain: 'acala',
    };
    const res = await shouldRouteHoma(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough DOT to transfer to router
    const bal = await fetchTokenBalances();
    if (bal.userBalDot.lt(parsedStakeAmount)) {
      if (bal.relayerBalDot.lt(parsedStakeAmount)) {
        throw new Error('both relayer and user do not have enough DOT to transfer to router!');
      }

      console.log('refilling dot for user ...');
      await (await dot.connect(relayerAcalaFork).transfer(TEST_ADDR_USER, parsedStakeAmount)).wait();
    }

    const bal0 = await fetchTokenBalances();

    console.log('sending auto routing request ...');
    const routeRes = await routeHomaAuto({
      ...routeArgs,
      token: DOT,
    });
    const reqId = routeRes.data;
    console.log(`auto route submitted! reqId: ${reqId}`);

    const waitForRoute = new Promise<void>((resolve, reject) => {
      const pollRouteStatus = setInterval(async () => {
        const res = await routeStatus({ id: reqId });
        // console.log(`current status: ${res.data.status}`);

        if (res.data[0].status === RouteStatus.Complete) {
          resolve();
          clearInterval(pollRouteStatus);
        }
      }, 1000);

      setTimeout(reject, 100 * 1000);
    });

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, userAcalaFork, DOT, stakeAmount);

    console.log('waiting for auto routing ...');
    await waitForRoute;

    console.log('route complete!');
    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await providerAcalaFork.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerBalDot.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // user should receive LDOT
    const routingFee = await fee.getFee(DOT);
    const exchangeRate = await homa.getExchangeRate();   // 10{18} LDOT => ? DOT
    const expectedLdot = parsedStakeAmount.sub(routingFee).mul(ONE_ACA).div(exchangeRate);
    const ldotReceived = bal1.userBalLdot.sub(bal0.userBalLdot);

    expect(almostEq(expectedLdot, ldotReceived)).to.be.true;
    expect(bal0.userBalDot.sub(bal1.userBalDot).toBigInt()).to.eq(parsedStakeAmount.toBigInt());

    // relayer should receive DOT fee
    expect(bal1.relayerBalDot.sub(bal0.relayerBalDot).toBigInt()).to.eq(routingFee.toBigInt());
  };

  it('route to evm address', async () => {
    await testHomaRouter(TEST_ADDR_USER);
  });

  it('route to substrate address', async () => {
    const ACALA_SS58_PREFIX = 10;
    const userAccountId = await evmAccounts.getAccountId(TEST_ADDR_USER);
    const userSubstrateAddr = encodeAddress(userAccountId, ACALA_SS58_PREFIX);

    await testHomaRouter(userSubstrateAddr);
  });

  it('auto route to evm address', async () => {
    await testAutoHomaRouter(TEST_ADDR_USER);
  });

  it('auto route to substrate address', async () => {
    const ACALA_SS58_PREFIX = 10;
    const userAccountId = await evmAccounts.getAccountId(TEST_ADDR_USER);
    const userSubstrateAddr = encodeAddress(userAccountId, ACALA_SS58_PREFIX);

    await testAutoHomaRouter(userSubstrateAddr);
  });
});
