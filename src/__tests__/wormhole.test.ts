import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { describe, expect, it } from 'vitest';

import { ETH_RPC, PARA_ID } from '../consts';
import {
  PROD_ADDR,
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
} from './testConsts';
import {
  expectError,
  routeWormhole,
  shouldRouteWormhole,
  sudoTransferToken,
} from './testUtils';
import { parseUnits } from 'ethers/lib/utils';

const USDC_ADDR = ROUTER_TOKEN_INFO.usdc.acalaAddr;
const USDC_ORIGIN_ADDR = ROUTER_TOKEN_INFO.usdc.originAddr;

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);

describe.concurrent('/shouldRouteWormhole', () => {
  it('when should route', async () => {
    const res = await shouldRouteWormhole({
      originAddr: USDC_ORIGIN_ADDR,
      targetChainId: String(CHAIN_ID_ETH),
      destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
      fromParaId: PARA_ID.HYDRA,
    });

    // router addr should only change if fee addr changed
    expect(res).toMatchInlineSnapshot(`
      {
        "data": {
          "routerAddr": "0x5fB6fD44ba21DFaf5ad99C9722F96371a39B859F",
          "shouldRoute": true,
        },
      }
    `);
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteWormhole({
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.HYDRA,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['originAddr is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: USDC_ORIGIN_ADDR,
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.HYDRA,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['targetChainId is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: USDC_ORIGIN_ADDR,
          targetChainId: String(CHAIN_ID_ETH),
          fromParaId: PARA_ID.HYDRA,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['destAddr is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: USDC_ORIGIN_ADDR,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['fromParaId is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const validArgs = {
        originAddr: USDC_ORIGIN_ADDR,
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: PARA_ID.HYDRA,
      };

      let res = await shouldRouteWormhole({
        ...validArgs,
        fromParaId: 1111,
      });
      expect(res).to.deep.eq({
        data: {
          shouldRoute: false,
          msg: 'unsupported origin parachain: 1111',
        },
      });

      const unsupportedToken = '0x07865c6e87b9f70255377e024ace6630c1e00000';
      res = await shouldRouteWormhole({
        ...validArgs,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1e00000',
      });
      expect(res).to.deep.eq({
        data: {
          shouldRoute: false,
          msg: `origin token ${unsupportedToken} not supported on router chain 12`,
        },
      });
    });
  });
});

describe('/routeWormhole', () => {
  const usdc = ERC20__factory.connect(USDC_ADDR, provider);

  it('when should route', async () => {
    const routeWhArgs = {
      targetChainId: String(CHAIN_ID_ETH),
      destAddr: TEST_ADDR_USER,
      fromParaId: PARA_ID.HYDRA,
      originAddr: USDC_ORIGIN_ADDR,
    };

    const res = await shouldRouteWormhole(routeWhArgs);
    const { routerAddr } = res.data;
    expect(routerAddr).toBeDefined();

    console.log('xcming to router ...');
    await sudoTransferToken(PROD_ADDR, routerAddr, provider, USDC_ADDR, 0.123);

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

    expect(afterBalRelayer - curBalRelayer).to.eq(parseUnits('0.04', 6).toBigInt());   // USDC has 6 decimals
  });

  // describe.skip('when should not route', () => {})
});
