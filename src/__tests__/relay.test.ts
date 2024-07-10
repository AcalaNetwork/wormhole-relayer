import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { CHAIN_ID_ACALA } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { describe, expect, it } from 'vitest';

import { ETH_RPC, RELAY_CONFIG } from '../consts';
import { PROD_ADDR } from './testConsts';
import { VAA_10_USDC_ETH_TO_ACALA, VAA_ALREADY_COMPLETED, VAA_TINY_JITOSOL_SOL_TO_ACALA } from './vaa';
import { expectError, relay, shouldRelay } from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);

const USDC_ADDR = ROUTER_TOKEN_INFO.usdc.acalaAddr;
const JITOSOL_ADDR = ROUTER_TOKEN_INFO.jitosol.acalaAddr;

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
        expectError(err, ['targetChain is a required field'], 400);
      }

      try {
        await shouldRelay({
          targetChain,
          amount: '10000',
        });

        expect.fail('should throw error but did not');
      } catch (err) {
        expectError(err, ['originAsset is a required field'], 400);
      }

      try {
        await shouldRelay({
          targetChain,
          originAsset: '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e',
        });

        expect.fail('should throw error but did not');
      } catch (err) {
        expectError(err, ['amount is a required field'], 400);
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


describe('/relay', () => {
  it('relay USDC to user', async () => {
    const usdc = ERC20__factory.connect(USDC_ADDR, provider);
    const curBalRelayer = (await usdc.balanceOf(PROD_ADDR)).toBigInt();
    console.log({ curBalRelayer });

    const result = await relay({
      targetChain: CHAIN_ID_ACALA,
      signedVAA: VAA_10_USDC_ETH_TO_ACALA,
    });
    expect(result.data?.status).to.eq(1);

    const afterBalRelayer = (await usdc.balanceOf(PROD_ADDR)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(10467941n);   // 10.467941 USDC
  });

  it('when amount too small', async () => {
    try {
      await relay({
        targetChain: CHAIN_ID_ACALA,
        signedVAA: VAA_TINY_JITOSOL_SOL_TO_ACALA,
      });

      expect.fail('should throw error but did not');
    } catch (err) {
      expectError(err, 'transfer amount too small, expect at least 1000000', 500);
    }
  });

  it('when contract throws', async () => {
    try {
      await relay({
        targetChain: CHAIN_ID_ACALA,
        signedVAA: VAA_ALREADY_COMPLETED,
      });

      expect.fail('should throw error but did not');
    } catch (err) {
      expectError(err, 'execution reverted: transfer already completed', 500);
    }
  });
});
