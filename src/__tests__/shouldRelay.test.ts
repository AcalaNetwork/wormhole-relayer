import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

import { RELAY_CONFIG } from '../consts';
import { shouldRelay } from './testUtils';

describe('/shouldRelay', () => {
  it('when should relay', async () => {
    for (const targetChain in RELAY_CONFIG) {
      const supported = RELAY_CONFIG[targetChain];

      for (const [token, minTransfer] of Object.entries(supported)) {
        const res = await shouldRelay({
          targetChain,
          originAsset: token,
          amount: minTransfer,
        });

        expect(res.data).toMatchSnapshot();
      }

      // if not lower case address
      for (const [token, minTransfer] of Object.entries(supported)) {
        const res = await shouldRelay({
          targetChain,
          originAsset: token.toUpperCase(),
          amount: minTransfer,
        });

        expect(res.data).toMatchSnapshot();
      }
    }
  });

  describe('when should not relay', () => {
    const targetChain = 12;
    const JITOSOL = 'j1toso1uck3rlmjorhttrvwy9hj7x8v9yyac6y7kgcpn';

    it('when missing params', async () => {
      try {
        await shouldRelay({
          originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
          amount: '10000',
        });

        expect.fail('should throw error but did not');
      } catch (err) {
        expect((err as AxiosError).response?.data).toMatchInlineSnapshot(`
          {
            "error": [
              "targetChain is a required field",
            ],
            "msg": "invalid request params!",
          }
        `);
      }

      try {
        await shouldRelay({
          targetChain,
          amount: '10000',
        });

        expect.fail('should throw error but did not');
      } catch (err) {
        expect((err as AxiosError).response?.data).toMatchInlineSnapshot(`
          {
            "error": [
              "originAsset is a required field",
            ],
            "msg": "invalid request params!",
          }
        `);
      }

      try {
        await shouldRelay({
          targetChain,
          originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        });

        expect.fail('should throw error but did not');
      } catch (err) {
        expect((err as AxiosError).response?.data).toMatchInlineSnapshot(`
          {
            "error": [
              "amount is a required field",
            ],
            "msg": "invalid request params!",
          }
        `);
      }
    });

    it('when relay condition not met', async () => {
      let res = await shouldRelay({
        targetChain: 3104,
        originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        amount: '10000',
      });
      expect(res.data).toMatchInlineSnapshot(`
        {
          "msg": "target chain 3104 is not supported",
          "shouldRelay": false,
        }
      `);

      const originAsset = '0x111111111191d46ee29420539fc25f0000000000';
      res = await shouldRelay({
        targetChain,
        originAsset,
        amount: '10000',
      });
      expect(res.data).toMatchInlineSnapshot(`
        {
          "msg": "originAsset 0x111111111191d46ee29420539fc25f0000000000 not supported",
          "shouldRelay": false,
        }
      `);

      res = await shouldRelay({
        targetChain,
        originAsset: JITOSOL,
        amount: '10',
      });
      expect(res.data).toMatchInlineSnapshot(`
        {
          "msg": "transfer amount too small, expect at least 1000000",
          "shouldRelay": false,
        }
      `);
    });

    it('when amount is not number', async () => {
      const res = await shouldRelay({
        targetChain,
        originAsset: JITOSOL,
        amount: '{"type":"BigNumber","hex":"0xe8d4a51000"}',
      });
      expect(res.data).toMatchInlineSnapshot(`
        {
          "msg": "failed to parse amount: {\\"type\\":\\"BigNumber\\",\\"hex\\":\\"0xe8d4a51000\\"}",
          "shouldRelay": false,
        }
      `);
    });
  });
});
