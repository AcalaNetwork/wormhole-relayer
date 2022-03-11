import axios from 'axios';
import { expect } from 'chai';
import { RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS } from '../relay/consts';

describe('/shouldRelay', () => {
  const checkShouldRelay = (params: any) => axios.get('http://localhost:3111/shouldRelay', { params });

  it('when should relay', async () => {
    for (const targetChain in RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS) {
      const supported = RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain];

      for (const [token, minTransfer] of Object.entries(supported)) {
        const res = await checkShouldRelay({
          targetChain,
          originTokenAddress: token,
          amount: minTransfer,
        });

        expect(res.data.shouldRelay).to.equal(true);
        expect(res.data.msg).to.equal('');
      }
    }
  });

  describe('when should not relay', () => {
    it('when missing params', async () => {
      let res = await checkShouldRelay({
        originTokenAddress: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        amount: '10000',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal('missing targetChain');
  
      res = await checkShouldRelay({
        targetChain: 11,
        amount: '10000',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal('missing originTokenAddress');
  
      res = await checkShouldRelay({
        targetChain: 11,
        originTokenAddress: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal('missing transfer amount');
    });

    it('when relay condition not met', async () => {
      let res = await checkShouldRelay({
        targetChain: 12345,
        originTokenAddress: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        amount: '10000',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal('target chain not supported');
  
      res = await checkShouldRelay({
        targetChain: 11,
        originTokenAddress: '0x111111111191d46ee29420539fc25f0000000000',
        amount: '10000',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal('token not supported');
      
      const USDT_BSC = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';
      const targetChain = 11;
      const originTokenAddress = USDT_BSC;
      res = await checkShouldRelay({
        targetChain,
        originTokenAddress,
        amount: '10000',
      });
      expect(res.data.shouldRelay).to.equal(false);
      expect(res.data.msg).to.equal(`transfer amount too small, expect at least ${RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain][originTokenAddress]}`);
    });
  });
});
