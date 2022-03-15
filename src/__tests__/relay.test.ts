import {
  getEmitterAddressEth,
  hexToUint8Array,
  nativeToHexString,
  transferFromEth,
  uint8ArrayToHex,
  CHAIN_ID_BSC,
  parseSequenceFromLogEth,
  ChainId,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import getSignedVAAWithRetry from '@certusone/wormhole-sdk/lib/cjs/rpc/getSignedVAAWithRetry';
import { setDefaultWasm } from '@certusone/wormhole-sdk/lib/cjs/solana/wasm';
import { parseUnits } from '@ethersproject/units';
import { ethers } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import axios from 'axios';
import { expect } from 'chai';
import {
  RELAY_URL,
  RELAYER_WALLET_ADDRESS,
  WORMHOLE_GUARDIAN_RPC,
  BSC_NODE_URL,
  BSC_PRIVATE_KEY,
  BSC_CORE_BRIDGE_ADDRESS,
  BSC_TOKEN_BRIDGE_ADDRESS,
  KARURA_TOKEN_BRIDGE_ADDRESS,
  ERC20_ADDRESS,
  NOT_SUPPORTED_ADDRESS,
} from './consts';

setDefaultWasm('node');

const transferEvm = async (
  sourceChain: ChainId,
  targetChain: ChainId,
  amount: string,
  recipientAddress: string,
  assetAddress: string,
  decimals: number,
): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(BSC_NODE_URL);
  const signer = new ethers.Wallet(BSC_PRIVATE_KEY, provider);

  const amountParsed = parseUnits(amount, decimals);
  const hexString = nativeToHexString(recipientAddress, targetChain);
  if (!hexString) {
    throw new Error('Invalid recipient');
  }
  const vaaCompatibleAddress = hexToUint8Array(hexString);

  const receipt = await transferFromEth(
    BSC_TOKEN_BRIDGE_ADDRESS,
    signer,
    assetAddress,
    amountParsed,
    targetChain,
    vaaCompatibleAddress,
  );

  return await parseSequenceFromLogEth(
    receipt,
    BSC_CORE_BRIDGE_ADDRESS,
  );
};

const transferFromBSCToKarura = async (amount: string, sourceAsset: string, decimals = 18): string => {
  const sequence = await transferEvm(
    CHAIN_ID_BSC,
    CHAIN_ID_KARURA,
    amount,
    RELAYER_WALLET_ADDRESS,
    sourceAsset,
    decimals,
  );
  console.log({ sequence });

  // poll until the guardian(s) witness and sign the vaa
  const emitterAddress = await getEmitterAddressEth(BSC_TOKEN_BRIDGE_ADDRESS);
  const { vaaBytes } = await getSignedVAAWithRetry(
    WORMHOLE_GUARDIAN_RPC,
    CHAIN_ID_BSC,
    emitterAddress,
    sequence,
    {
      transport: NodeHttpTransport(),
    }
  );

  const signedVAA = uint8ArrayToHex(vaaBytes);
  return signedVAA;
};

describe('/relay', () => {
  describe('Send ERC20 from BSC to Karura', () => {
    it('relay correctly when should relay', async () => {
      const signedVAA = await transferFromBSCToKarura('0.01', ERC20_ADDRESS);
      console.log({ signedVAA });

      const result = await axios.post(RELAY_URL, {
        targetChain: CHAIN_ID_KARURA,
        signedVAA,
      });

      expect(result.data).to.includes({
        from: RELAYER_WALLET_ADDRESS,
        to: KARURA_TOKEN_BRIDGE_ADDRESS,
        status: 1,
      });
    });

    it('throw correct error when transfer amount too small', async () => {
      const signedVAA = await transferFromBSCToKarura('0.001', ERC20_ADDRESS);
      console.log({ signedVAA });

      let failed = false;
      try {
        await axios.post(RELAY_URL, {
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });
      } catch (e: AxiosError) {
        failed = true;
        expect(e.response.status).to.equal(400);
        expect(e.response.data.error).to.includes('transfer amount too small');
      }

      expect(failed).to.equal(true);
    });

    it.skip('throw correct error when token not supported', async () => {
      const signedVAA = await transferFromBSCToKarura('10', NOT_SUPPORTED_ADDRESS);
      console.log({ signedVAA });

      let failed = false;
      try {
        await axios.post(RELAY_URL, {
          targetChain: CHAIN_ID_KARURA,
          signedVAA,
        });
      } catch (e: AxiosError) {
        failed = true;
        expect(e.response.status).to.equal(400);
        expect(e.response.data.error).to.includes('token not supported');
      }

      expect(failed).to.equal(true);
    });
  });
});
