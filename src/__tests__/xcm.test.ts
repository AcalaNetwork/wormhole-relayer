import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { describe, expect, it } from 'vitest';

import { ETH_RPC, PARA_ID } from '../consts';
import {
  PROD_ADDR,
  TEST_ADDR_RELAYER,
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
  sudoTransferToken,
} from './testUtils';
import { parseUnits } from 'ethers/lib/utils';


const DAI_ADDR = ROUTER_TOKEN_INFO.dai.acalaAddr;

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);

const routeXcmArgs = {
  dest: '0x04010200c91f0100525756d2a8c2bb099f2ac22c669bb5a1e5eaf94f687f7b7c5779b288b05bed75',
  destParaId: '2034',     // hydra
  originAddr: ROUTER_TOKEN_INFO.dai.originAddr,
};

describe.concurrent('/shouldRouteXcm', () => {
  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  it('when should route', async () => {
    const res = await shouldRouteXcm(routeXcmArgs);
    expect(res).toMatchInlineSnapshot(`
      {
        "data": {
          "routerAddr": "0xc5Dd20eD342CEFeCe9E013D7D1763c398E987F7d",
          "routerChainId": 12,
          "shouldRoute": true,
        },
      }
    `);
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteXcm({
          destParaId: PARA_ID.BASILISK,
          originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['dest is a required field'], 400);
      }

      try {
        await shouldRouteXcm({
          dest,
          originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['destParaId is a required field'], 400);
      }

      try {
        await shouldRouteXcm({
          dest,
          destParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['originAddr is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const validArgs = {
        dest,
        destParaId: PARA_ID.BASILISK,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      };

      let res = await shouldRouteXcm({
        ...validArgs,
        destParaId: 1111,
      });
      expect(res).to.deep.eq({
        data: {
          shouldRoute: false,
          msg: 'unsupported dest parachain: 1111',
        },
      });

      const unsupportedToken = '0x07865c6e87b9f70255377e024ace6630c1e00000';
      res = await shouldRouteXcm({
        ...validArgs,
        originAddr: unsupportedToken,
      });
      expect(res).to.deep.eq({
        data: {
          shouldRoute: false,
          msg: `unsupported token on dest parachin 2090. Token origin address: ${unsupportedToken}`,
        },
      });

      // TODO: need to validate dest?
      // res = await shouldRouteXcm({
      //   ...validArgs,
      //   dest: '0xabcd'
      // });
      // expect(res.data.shouldRoute).to.equal(false);
      // expect(res.data.msg).to.contain('unsupported router chainId: 8');
    });
  });
});

describe('/routeXcm', () => {
  it('when should route', async () => {
    const res = await shouldRouteXcm(routeXcmArgs);
    const { routerAddr } = res.data;

    console.log('transferring to router ...');
    await sudoTransferToken(PROD_ADDR, routerAddr, provider, DAI_ADDR, 1.23);

    const dai = ERC20__factory.connect(DAI_ADDR, provider);
    const curBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeXcm(routeXcmArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    const afterBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(parseUnits('0.04', 18).toBigInt());    // DAI has 18 decimals
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

    expect(afterBalRelayer - curBalRelayer).to.eq(parseUnits('0.04', 18).toBigInt());    // DAI has 18 decimals
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
