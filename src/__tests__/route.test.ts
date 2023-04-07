import { CHAIN_ID_ETH, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from '../consts';
import { SHOULD_ROUTE_WORMHOLE_URL, SHOULD_ROUTE_XCM_URL } from './consts';

describe.skip('/routeXcm', () => {
  const checkShouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });

  it('when should route', async () => {
    for (const [routerChainId, supportedChains] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const [destChain, supportedTokens] of Object.entries(supportedChains)) {

        const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
        for (const tokenAddr of supportedTokens) {
          let res = await checkShouldRouteXcm({
            dest,
            routerChainId: routerChainId,
            targetChain: destChain,
            originAddr: tokenAddr,
          });

          expect(res.data.shouldRoute).to.equal(true);
          expect(res.data.msg).to.equal('');
          expect(res.data.routerAddr).to.equal('0x8341Cd8b7bd360461fe3ce01422fE3E24628262F');

          // should be case insensitive
          res = await checkShouldRouteXcm({
            dest,
            routerChainId: routerChainId,
            targetChain: destChain,
            originAddr: tokenAddr.toUpperCase(),
          });

          expect(res.data.shouldRoute).to.equal(true);
          expect(res.data.msg).to.equal('');
          expect(res.data.routerAddr).to.equal('0x8341Cd8b7bd360461fe3ce01422fE3E24628262F');
        }
      }
    }
  });
});

