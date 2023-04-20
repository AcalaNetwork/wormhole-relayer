import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { BASILISK_PARA_ID, ETH_USDC, ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from '../consts';
import { SHOULD_ROUTE_WORMHOLE_URL, SHOULD_ROUTE_XCM_URL } from './consts';

describe('/shouldRouteXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });

  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  it('when should route', async () => {
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

  describe('when should not route', () => {
    it('when missing params', async () => {
      let res = await shouldRouteXcm({
        destParaId: BASILISK_PARA_ID,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data).to.deep.eq({
        error: ['dest is a required field'],
        msg: 'invalid request params!',
      });

      res = await shouldRouteXcm({
        dest,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data).to.deep.eq({
        error: ['destParaId is a required field'],
        msg: 'invalid request params!',
      });

      res = await shouldRouteXcm({
        dest,
        destParaId: BASILISK_PARA_ID,
      });
      expect(res.data).to.deep.eq({
        error: ['originAddr is a required field'],
        msg: 'invalid request params!',
      });
    });

    it('when bad params', async () => {
      const validArgs = {
        dest,
        destParaId: BASILISK_PARA_ID,
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

describe('/shouldRouteWormhole', () => {
  const shouldRouteWormhole = (params: any) => axios.get(SHOULD_ROUTE_WORMHOLE_URL, { params });

  it('when should route', async () => {
    for (const supportedTokens of Object.values(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const tokenAddr of supportedTokens) {
        let res = await shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: BASILISK_PARA_ID,
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
          fromParaId: BASILISK_PARA_ID,
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

  describe('when should not route', () => {
    it('when missing params', async () => {
      let res = await shouldRouteWormhole({
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: BASILISK_PARA_ID,
      });
      expect(res.data).to.deep.eq({
        error: ['originAddr is a required field'],
        msg: 'invalid request params!',
      });

      res = await shouldRouteWormhole({
        originAddr: ETH_USDC,
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: BASILISK_PARA_ID,
      });
      expect(res.data).to.deep.eq({
        error: ['targetChainId is a required field'],
        msg: 'invalid request params!',
      });

      res = await shouldRouteWormhole({
        originAddr: ETH_USDC,
        targetChainId: String(CHAIN_ID_ETH),
        fromParaId: BASILISK_PARA_ID,
      });
      expect(res.data).to.deep.eq({
        error: ['destAddr is a required field'],
        msg: 'invalid request params!',
      });

      res = await shouldRouteWormhole({
        originAddr: ETH_USDC,
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
      });

      expect(res.data).to.deep.eq({
        error: ['fromParaId is a required field'],
        msg: 'invalid request params!',
      });
    });

    it('when bad params', async () => {
      const validArgs = {
        originAddr: ETH_USDC,
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: BASILISK_PARA_ID,
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
