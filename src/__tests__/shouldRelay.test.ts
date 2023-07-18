import { describe, it } from 'vitest';
import { expect } from 'chai';

import { RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS } from '../consts';
import { shouldRelay } from './testUtils';

describe('/shouldRelay', () => {
  it('when should relay', async () => {
    for (const targetChain in RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS) {
      const supported = RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain];

      for (const [token, minTransfer] of Object.entries(supported)) {
        const res = await shouldRelay({
          targetChain,
          originAsset: token,
          amount: minTransfer,
        });

        expect(res.shouldRelay).to.equal(true);
        expect(res.msg).to.equal('');
      }

      // if not lower case address
      for (const [token, minTransfer] of Object.entries(supported)) {
        const res = await shouldRelay({
          targetChain,
          originAsset: token.toUpperCase(),
          amount: minTransfer,
        });

        expect(res.shouldRelay).to.equal(true);
        expect(res.msg).to.equal('');
      }
    }
  });

  describe('when should not relay', () => {
    const USDT_BSC = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';

    it('when missing params', async () => {
      let res = await shouldRelay({
        originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        amount: '10000',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal('missing targetChain');

      res = await shouldRelay({
        targetChain: 11,
        amount: '10000',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal('missing originAsset');

      res = await shouldRelay({
        targetChain: 11,
        originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal('missing transfer amount');
    });

    it('when relay condition not met', async () => {
      let res = await shouldRelay({
        targetChain: 12345,
        originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        amount: '10000',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal('target chain not supported');

      res = await shouldRelay({
        targetChain: 11,
        originAsset: '0x111111111191d46ee29420539fc25f0000000000',
        amount: '10000',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal('token not supported');

      const targetChain = 11;
      const originAsset = USDT_BSC;
      res = await shouldRelay({
        targetChain,
        originAsset,
        amount: '10000',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.equal(`transfer amount too small, expect at least ${RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain][originAsset]}`);
    });

    it('when amount is not number', async () => {
      const res = await shouldRelay({
        targetChain: 11,
        originAsset: USDT_BSC,
        amount: '{"type":"BigNumber","hex":"0xe8d4a51000"}',
      });
      expect(res.shouldRelay).to.equal(false);
      expect(res.msg).to.contain('failed to parse amount');
    });
  });
});
