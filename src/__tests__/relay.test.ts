import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { CHAIN_ID_ACALA } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { describe, expect, it } from 'vitest';

import { ETH_RPC } from '../consts';
import { VAA_10_USDC_ETH_TO_ACALA } from './vaa';
import { relay } from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);

const USDC_ADDR = ROUTER_TOKEN_INFO.usdc.acalaAddr;
const USER_ADDR = '0xBbBBa9Ebe50f9456E106e6ef2992179182889999';

describe('/relay', () => {
  it('relay USDC to user', async () => {
    const usdc = ERC20__factory.connect(USDC_ADDR, provider);
    const curBalRelayer = (await usdc.balanceOf(USER_ADDR)).toBigInt();
    console.log({ curBalRelayer });

    const result = await relay({
      targetChain: CHAIN_ID_ACALA,
      signedVAA: VAA_10_USDC_ETH_TO_ACALA,
    });
    expect(result.data?.status).to.eq(1);

    const afterBalRelayer = (await usdc.balanceOf(USER_ADDR)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(10467941n);   // 10.467941 USDC
  });
});
