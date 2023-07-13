import { CHAIN_ID_KARURA, CONTRACTS } from '@certusone/wormhole-sdk';
import axios from 'axios';
import {
  RELAY_URL,
  BSC_USDT_ADDRESS,
  NOT_SUPPORTED_ADDRESS,
  TEST_USER_ADDR,
  TEST_RELAYER_ADDR,
} from './consts';
import { transferFromBSCToKarura } from './utils';
import { describe, expect, it } from 'vitest';

describe('/relay', () => {
  describe('Send ERC20 from BSC to Karura', () => {
    it('relay correctly when should relay', async () => {
      const signedVAA = await transferFromBSCToKarura('0.1', BSC_USDT_ADDRESS, TEST_USER_ADDR);
      console.log({ signedVAA });

      console.log(`relaying with ${RELAY_URL}`);
      const result = await axios.post(RELAY_URL, {
        targetChain: CHAIN_ID_KARURA,
        signedVAA,
      });

      console.log('relay result: ', result.data);

      expect(result.data).to.includes({
        from: TEST_RELAYER_ADDR,
        to: CONTRACTS.TESTNET.karura.token_bridge,
        status: 1,
      });
    });

    it.skip('throw correct error when transfer amount too small', async () => {
      const signedVAA = await transferFromBSCToKarura('0.01', BSC_USDT_ADDRESS, TEST_USER_ADDR);
      console.log({ signedVAA });

      let failed = false;
      try {
        await axios.post(RELAY_URL, {
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });
      } catch (e) {
        failed = true;
        expect(e.response.status).to.equal(400);
        expect(e.response.data.error).to.includes('transfer amount too small');
      }

      expect(failed).to.equal(true);
    });

    it.skip('throw correct error when token not supported', async () => {
      const signedVAA = await transferFromBSCToKarura('10', NOT_SUPPORTED_ADDRESS, TEST_USER_ADDR);
      console.log({ signedVAA });

      let failed = false;
      try {
        await axios.post(RELAY_URL, {
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });
      } catch (e) {
        failed = true;
        expect(e.response.status).to.equal(400);
        expect(e.response.data.error).to.includes('token not supported');
      }

      expect(failed).to.equal(true);
    });
  });
});
