import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { BASILISK_PARA_ID, ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from '../consts';
import { SHOULD_ROUTE_WORMHOLE_URL, SHOULD_ROUTE_XCM_URL } from './consts';

describe('/shouldRouteXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });

  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  it('when should route', async () => {
    for (const [routerChainId, supportedChains] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const [destParaId, supportedTokens] of Object.entries(supportedChains)) {
        for (const tokenAddr of supportedTokens) {
          let res = await shouldRouteXcm({
            dest,
            routerChainId,
            destParaId,
            originAddr: tokenAddr,
          });

          expect(res.data.shouldRoute).to.equal(true);
          expect(res.data.msg).to.equal('');
          expect(res.data.routerAddr).to.equal('0x8341Cd8b7bd360461fe3ce01422fE3E24628262F');

          // should be case insensitive
          res = await shouldRouteXcm({
            dest,
            routerChainId: routerChainId,
            destParaId,
            originAddr: tokenAddr.toUpperCase(),
          });

          expect(res.data.shouldRoute).to.equal(true);
          expect(res.data.msg).to.equal('');
          expect(res.data.routerAddr).to.equal('0x8341Cd8b7bd360461fe3ce01422fE3E24628262F');
        }
      }
    }
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      let res = await shouldRouteXcm({
        routerChainId: 11,
        destParaId: BASILISK_PARA_ID,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('dest is a required field');

      res = await shouldRouteXcm({
        dest,
        destParaId: BASILISK_PARA_ID,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('routerChainId is a required field');

      res = await shouldRouteXcm({
        dest,
        routerChainId: 11,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('destParaId is a required field');

      res = await shouldRouteXcm({
        dest,
        routerChainId: 11,
        destParaId: BASILISK_PARA_ID,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('originAddr is a required field');
    });

    it('when wrong params', async () => {
      const validArgs = {
        dest,
        routerChainId: 11,
        destParaId: BASILISK_PARA_ID,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      };

      let res = await shouldRouteXcm({
        ...validArgs,
        routerChainId: 8,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('unsupported router chainId: 8');

      res = await shouldRouteXcm({
        ...validArgs,
        destParaId: 1111,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('unsupported dest parachain: 1111');

      const unsupportedToken = '0x07865c6e87b9f70255377e024ace6630c1e00000';
      res = await shouldRouteXcm({
        ...validArgs,
        originAddr: unsupportedToken,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain(`unsupported token on dest parachin 2090. Token origin address: ${unsupportedToken}`);

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

describe.skip('/shouldRouteWormhole', () => {
  const checkShouldRouteWormhole = (params: any) => axios.get(SHOULD_ROUTE_WORMHOLE_URL, { params });

  it('when should route', async () => {
    for (const [routerChainId, supportedChains] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const [_, supportedTokens] of Object.entries(supportedChains)) {

        for (const tokenAddr of supportedTokens) {
          const res = await checkShouldRouteWormhole({
            destAddr: '0x75E480dB528101a381Ce68544611C169Ad7EB342',
            routerChainId,
            targetChainId: CHAIN_ID_ETH,
            originAddr: tokenAddr,
          });

          console.log(res);
          expect(res.data.shouldRoute).to.equal(true);
          expect(res.data.msg).to.equal('');
        }

        // if not lower case address
        // for (const tokenAddr of supportedTokens) {
        //   const res = await checkShouldRouteWormhole({
        //     destAddr: '0x',
        //     routerChainId: CHAIN_ID_KARURA,
        //     targetChain: destChain,
        //     originAddr: tokenAddr.toUpperCase(),
        //   });

      //   console.log(res);
      //   expect(res.data.shouldRoute).to.equal(true);
      //   expect(res.data.msg).to.equal('');
      // }
      }

    }
  });
});
