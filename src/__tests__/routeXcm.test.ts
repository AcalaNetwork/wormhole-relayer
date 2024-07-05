import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ETH_RPC } from '../consts';
import {
  TEST_ADDR_RELAYER,
  TEST_KEY,
} from './testConsts';
import {
  VAA_10_DAI_ETH_TO_HYDRA,
  VAA_10_USDC_ETH_TO_ACALA,
  VAA_RANDOM_TOKEN_BSC_TO_ACALA,
  VAA_TINY_AMOUNT_DAI_BSC_TO_ACALA,
} from './vaa';
import {
  expectError,
  expectErrorData,
  relayAndRoute,
  relayAndRouteBatch,
  routeXcm,
  shouldRouteXcm,
  transferToRouter,
} from './testUtils';

const DAI_ADDR = ROUTER_TOKEN_INFO.dai.acalaAddr;

const routeXcmArgs = {
  dest: '0x04010200c91f0100525756d2a8c2bb099f2ac22c669bb5a1e5eaf94f687f7b7c5779b288b05bed75',
  destParaId: '2034',     // hydra
  originAddr: ROUTER_TOKEN_INFO.dai.originAddr,
};

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);

describe('/routeXcm', () => {
  it('when should route', async () => {
    const res = await shouldRouteXcm(routeXcmArgs);
    const { routerAddr } = res.data;

    console.log('transferring to router ...');
    await transferToRouter(routerAddr, relayer);

    const dai = ERC20__factory.connect(DAI_ADDR, provider);
    const curBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeXcm(routeXcmArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    const afterBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
    expect((await dai.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  // describe.skip('when should not route', () => {})
});

describe('/relayAndRoute', () => {
  it('when should route', async () => {
    const { routerAddr } = (await shouldRouteXcm(routeXcmArgs)).data;
    console.log({ routerAddr });

    const relayAndRouteXcmArgs = {
      ...routeXcmArgs,
      signedVAA: VAA_10_DAI_ETH_TO_HYDRA,
    };

    const dai = ERC20__factory.connect(DAI_ADDR, provider);
    const curBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    const wormholeWithdrawFilter = dai.filters.Transfer(
      '0x0000000000000000000000000000000000000000',
      routerAddr,
    );
    dai.once(wormholeWithdrawFilter, (_from, _to, _value, event) => {
      console.log(`relay finished! txHash: ${event.transactionHash}`);
    });

    const res = await relayAndRoute(relayAndRouteXcmArgs);
    console.log(`route finished! txHash: ${res.data}`);

    const afterBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
    expect((await dai.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  it('when should not route', async () => {
    try {
      await relayAndRoute({
        ...routeXcmArgs,
        signedVAA: VAA_TINY_AMOUNT_DAI_BSC_TO_ACALA,    // bridge 0.000001 DAI
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'token amount too small to relay', 500);
    }

    try {
      await relayAndRoute({
        ...routeXcmArgs,
        signedVAA: VAA_RANDOM_TOKEN_BSC_TO_ACALA,
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'unsupported token', 500);
    }

    try {
      await relayAndRouteBatch({
        ...routeXcmArgs,
        signedVAA: VAA_10_USDC_ETH_TO_ACALA + '12345',   // invalid VAA
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'failed to estimate gas limit', 500);
      expectErrorData(err, errData => {
        expect(errData.params.err.reason).to.contain('VM signature invalid');
      });
    }
  });
});

// not in use
describe.skip('/relayAndRouteBatch', () => {});
