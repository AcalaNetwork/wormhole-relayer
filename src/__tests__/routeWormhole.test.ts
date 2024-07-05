import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { CHAIN_ID_AVAX } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';

import { ETH_RPC, PARA_ID } from '../consts';
import {
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  routeWormhole,
  shouldRouteWormhole,
  transferToRouter,
} from './testUtils';

const USDC_ADDR = ROUTER_TOKEN_INFO.usdc.acalaAddr;
const USDC_ORIGIN_ADDR = ROUTER_TOKEN_INFO.usdc.originAddr;

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);

describe('/routeWormhole', () => {
  const usdc = ERC20__factory.connect(USDC_ADDR, provider);

  it('when should route', async () => {
    const routeWhArgs = {
      targetChainId: String(CHAIN_ID_AVAX),
      destAddr: TEST_ADDR_USER,
      fromParaId: PARA_ID.BASILISK,
      originAddr: USDC_ORIGIN_ADDR,
    };

    const res = await shouldRouteWormhole(routeWhArgs);
    const { routerAddr } = res.data;

    console.log('xcming to router ...');
    await transferToRouter(routerAddr, relayer);

    const curBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeWormhole(routeWhArgs);
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    // router should be destroyed
    expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(0n);
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');

    const afterBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
  });

  // describe.skip('when should not route', () => {})
});
