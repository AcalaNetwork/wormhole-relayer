import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { describe, it, expect } from 'vitest';
import { GOERLI_USDC, PARA_ID, ROUTE_SUPPORTED_CHAINS_AND_ASSETS, ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD } from '../consts';
import { SHOULD_ROUTE_WORMHOLE_URL, SHOULD_ROUTE_XCM_URL } from './consts';

describe.concurrent('/shouldRouteXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });

  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  it('when should route (testnet)', async () => {
    for (const [destParaId, supportedTokens] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const tokenAddr of supportedTokens) {
        let res = await shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr,
        });

        expect(res.data).to.deep.eq({
          data: {
            shouldRoute: true,
            routerAddr: '0x8341Cd8b7bd360461fe3ce01422fE3E24628262F',
            routerChainId: 11,
          },
        });

        // should be case insensitive
        res = await shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr.toUpperCase(),
        });

        expect(res.data).to.deep.eq({
          data: {
            shouldRoute: true,
            routerAddr: '0x8341Cd8b7bd360461fe3ce01422fE3E24628262F',
            routerChainId: 11,
          },
        });
      }
    }
  });

  it.skip('when should route (mainnet)', async () => {
    const resPendings = [] as Promise<any>[];
    for (const [destParaId, supportedTokens] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD)) {
      for (const tokenAddr of supportedTokens) {
        let resPending = shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr,
        });

        resPendings.push(resPending);

        // should be case insensitive
        resPending = shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr.toUpperCase(),
        });

        resPendings.push(resPending);
      }
    }

    const allRes = await Promise.all(resPendings);
    expect(allRes.map(res => res.data)).toMatchSnapshot();
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteXcm({
          destParaId: PARA_ID.BASILISK,
          originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['dest is a required field']);
      }

      try {
        await shouldRouteXcm({
          dest,
          originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['destParaId is a required field']);
      }

      try {
        await shouldRouteXcm({
          dest,
          destParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['originAddr is a required field']);
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
      expect(res.data).to.deep.eq({
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
      expect(res.data).to.deep.eq({
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
      // expect(res.data.data.shouldRoute).to.equal(false);
      // expect(res.data.data.msg).to.contain('unsupported router chainId: 8');
    });
  });
});

describe.concurrent('/shouldRouteWormhole', () => {
  const shouldRouteWormhole = (params: any) => axios.get(SHOULD_ROUTE_WORMHOLE_URL, { params });

  it('when should route (testnet)', async () => {
    for (const supportedTokens of Object.values(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const tokenAddr of supportedTokens) {
        let res = await shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });

        expect(res.data).to.deep.eq({
          data: {
            shouldRoute: true,
            routerAddr: '0xC8a0596848966f61be4cd1875373d2728e162eE2',
          },
        });

        // should be case insensitive
        res = await shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });

        expect(res.data).to.deep.eq({
          data: {
            shouldRoute: true,
            routerAddr: '0xC8a0596848966f61be4cd1875373d2728e162eE2',
          },
        });
      }
    }
  });

  it.skip('when should route (mainnet)', async () => {
    const resPendings = [] as Promise<any>[];
    for (const supportedTokens of Object.values(ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD)) {
      for (const tokenAddr of supportedTokens) {
        let resPending = shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });

        resPendings.push(resPending);

        // should be case insensitive
        resPending = shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });

        resPendings.push(resPending);
      }
    }

    const allRes = await Promise.all(resPendings);
    for (const res of allRes) {
      // router addr should only change if fee addr changed
      expect(res.data).to.deep.eq({
        data: {
          shouldRoute: true,
          routerAddr: '0x5E0fE43f1eeaca029390D061DE2e6377B5eaEE3a',
        },
      });
    }
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteWormhole({
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['originAddr is a required field']);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['targetChainId is a required field']);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
          targetChainId: String(CHAIN_ID_ETH),
          fromParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['destAddr is a required field']);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        });
        expect.fail('did not throw an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.error).to.deep.equal(['fromParaId is a required field']);
      }
    });

    it('when bad params', async () => {
      const validArgs = {
        originAddr: GOERLI_USDC,
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: PARA_ID.BASILISK,
      };

      let res = await shouldRouteWormhole({
        ...validArgs,
        fromParaId: 1111,
      });
      expect(res.data).to.deep.eq({
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
      expect(res.data).to.deep.eq({
        data: {
          shouldRoute: false,
          msg: `origin token ${unsupportedToken} not supported on router chain 11`,
        },
      });
    });
  });
});
