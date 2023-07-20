import { CHAIN_ID_KARURA, CONTRACTS } from '@certusone/wormhole-sdk';
import { describe, expect, it } from 'vitest';

import { FUJI_TOKEN, RELAYER_URL } from '../consts';
import {
  NOT_SUPPORTED_ADDRESS,
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
} from './testConsts';
import { expectError, relay, transferFromFujiToKaruraTestnet } from './testUtils';

describe('/relay', () => {
  describe('Send ERC20 from Fuji to Karura Testnet', () => {
    it('relay correctly when should relay', async () => {
      const signedVAA = await transferFromFujiToKaruraTestnet('0.01', FUJI_TOKEN.USDC, TEST_ADDR_USER);
      console.log({ signedVAA });

      console.log(`relaying with ${RELAYER_URL.RELAY}`);
      const result = await relay({
        targetChain: CHAIN_ID_KARURA,
        signedVAA,
      });

      // console.log('relay result: ', result);

      expect(result).to.includes({
        from: TEST_ADDR_RELAYER,
        to: CONTRACTS.TESTNET.karura.token_bridge,
        status: 1,
      });
    });

    it('throw correct error when transfer amount too small', async () => {
      const signedVAA = '01000000000100e6e6d0e1f030a6d7ba3815e4f918c7657edf0ce3ec98d1cf5d1b9f86f9d43f832d4445ce45bfeba3167b9e89dc6a02e5ef85602ee021c635a4af7caffa837d310164b759bcc9ee0000000600000000000000000000000061e44e506ca5659e6c0bba9b678586fa2d7297560000000000001ad50101000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00020000000000000000000000000085560b24769dac4ed057f1b2ae40746aa9aab6000b0000000000000000000000000000000000000000000000000000000000000000';

      try {
        await relay({
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });

        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, 'transfer amount too small, expect at least 1000', 400);
      }
    });

    it.skip('throw correct error when token not supported', async () => {
      const signedVAA = await transferFromFujiToKaruraTestnet('10', NOT_SUPPORTED_ADDRESS, TEST_ADDR_USER);
      console.log({ signedVAA });

      try {
        await relay({
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });

        expect.fail('did not throw an err');
      } catch (e) {
        expect(e.response.status).to.equal(400);
        expect(e.response.data.error).to.includes('token not supported');
      }
    });
  });
});
