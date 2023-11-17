import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import { describe, expect, it } from 'vitest';

import {
  GOERLI_USDC,
  PARA_ID,
  ROUTE_SUPPORTED_CHAINS_AND_ASSETS,
  ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD,
} from '../consts';
import { Mainnet } from '../utils';
import {
  expectError,
  shouldRouteHoma,
  shouldRouteWormhole,
  shouldRouteXcm,
} from './testUtils';

describe.concurrent('/shouldRouteXcm', () => {
  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  it('when should route (testnet)', async () => {
    for (const [destParaId, supportedTokens] of Object.entries(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const tokenAddr of supportedTokens) {
        let res = await shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr,
        });

        expect(res).to.deep.eq({
          data: {
            shouldRoute: true,
            routerAddr: '0x8341Cd8b7bd360461fe3ce01422fE3E24628262F',
            routerChainId: 11,
          },
        });

        res = await shouldRouteXcm({
          dest,
          destParaId,
          originAddr: tokenAddr.toUpperCase(),
        });

        expect(res).to.deep.eq({
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

describe.concurrent('/shouldRouteWormhole', () => {
  it('when should route (testnet)', async () => {
    for (const supportedTokens of Object.values(ROUTE_SUPPORTED_CHAINS_AND_ASSETS)) {
      for (const tokenAddr of supportedTokens) {
        let res = await shouldRouteWormhole({
          originAddr: tokenAddr,
          targetChainId: String(CHAIN_ID_ETH),
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });

        expect(res).to.deep.eq({
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

        expect(res).to.deep.eq({
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
      expect(res).to.deep.eq({
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
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['originAddr is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
          destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
          fromParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['targetChainId is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
          targetChainId: String(CHAIN_ID_ETH),
          fromParaId: PARA_ID.BASILISK,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['destAddr is a required field'], 400);
      }

      try {
        await shouldRouteWormhole({
          originAddr: GOERLI_USDC,
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
        originAddr: GOERLI_USDC,
        targetChainId: String(CHAIN_ID_ETH),
        destAddr: '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6',
        fromParaId: PARA_ID.BASILISK,
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
          msg: `origin token ${unsupportedToken} not supported on router chain 11`,
        },
      });
    });
  });
});

describe.concurrent.skip('/shouldRouteHoma', () => {
  const destAddr = '0x75E480dB528101a381Ce68544611C169Ad7EB342';
  const destAddrSubstrate = '23AdbsfRysaabyrWS2doCFsKisvt7dGbS3wQFXRS6pNbQY8G';

  describe('when should route', async () => {
    it('to evm address', async () => {
      // for (const network of [Object.values(Mainnet)]) {
      for (const chain of ['acala']) {
        let res = await shouldRouteHoma({
          destAddr,
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "routerAddr": "0xa013818BBddc5d2d55ab9cCD50759b3B1953d6cd",
            "shouldRoute": true,
          },
        }
      `);

        // should be case insensitive
        res = await shouldRouteHoma({
          destAddr: destAddr.toLocaleLowerCase(),
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "routerAddr": "0xa013818BBddc5d2d55ab9cCD50759b3B1953d6cd",
            "shouldRoute": true,
          },
        }
      `);
      }
    });

    it('to substrate address', async () => {
    // for (const network of [Object.values(Mainnet)]) {
      for (const chain of ['acala']) {
        let res = await shouldRouteHoma({
          destAddr: destAddrSubstrate,
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
          {
            "data": {
              "routerAddr": "0xfD6143c380706912a04230f22cF92c402561820e",
              "shouldRoute": true,
            },
          }
        `);

        // should be case insensitive
        res = await shouldRouteHoma({
          destAddr: destAddrSubstrate.toLocaleLowerCase(),
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
          {
            "data": {
              "msg": "address 23adbsfrysaabyrws2docfskisvt7dgbs3wqfxrs6pnbqy8g is not a valid evm or substrate address",
              "shouldRoute": false,
            },
          }
        `);
      }
    });
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteHoma({
          destAddr,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['chain is a required field'], 400);
      }

      try {
        await shouldRouteHoma({
          chain: Mainnet.Acala,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['destAddr is a required field'], 400);
      }

      try {
        await shouldRouteHoma({
          chain: 'mandala',
          destAddr,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['chain must be one of the following values: acala, karura'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await shouldRouteHoma({
        chain: Mainnet.Acala,
        destAddr: '0xaaaaaaaaaa',
      });
      expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "msg": "address 0xaaaaaaaaaa is not a valid evm or substrate address",
            "shouldRoute": false,
          },
        }
      `);
    });
  });
});
