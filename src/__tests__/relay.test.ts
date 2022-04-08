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
  CHAIN_ID_ETH,
} from '@certusone/wormhole-sdk';
import getSignedVAAWithRetry from '@certusone/wormhole-sdk/lib/cjs/rpc/getSignedVAAWithRetry';
import { setDefaultWasm } from '@certusone/wormhole-sdk/lib/cjs/solana/wasm';
import { parseUnits } from '@ethersproject/units';
import { ethers, Wallet } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import axios from 'axios';
import dotenv from 'dotenv';
import { expect } from 'chai';
import {
  RELAY_URL,
  WORMHOLE_GUARDIAN_RPC,
  NODE_URL_BSC,
  SENDER_PRIVATE_KEY,
  BSC_CORE_BRIDGE_ADDRESS,
  BSC_TOKEN_BRIDGE_ADDRESS,
  KARURA_TOKEN_BRIDGE_ADDRESS,
  BSC_USDT_ADDRESS,
  NOT_SUPPORTED_ADDRESS,
  GOERLI_USDC_ADDRESS,
  NODE_URL_GOERLI,
  GOERLI_TOKEN_BRIDGE_ADDRESS,
  GOERLI_CORE_BRIDGE_ADDRESS,
} from './consts';

setDefaultWasm('node');

dotenv.config({ path: '.env' });
const {
  KARURA_PRIVATE_KEY,
  ACALA_PRIVATE_KEY,
  KARURA_RPC_URL_HTTP,
  ACALA_RPC_URL_HTTP,
} = process.env;

const relayerAddressKarura = new Wallet(KARURA_PRIVATE_KEY).address;
const relayerAddressAcala = new Wallet(ACALA_PRIVATE_KEY).address;

const transferEvm = async (
  nodeUrl: string,
  tokenBridgeAddress: string,
  coreBridgeAddress: string,
  sourceChain: ChainId,
  targetChain: ChainId,
  amount: string,
  recipientAddress: string,
  assetAddress: string,
  decimals: number,
): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
  const signer = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);

  const amountParsed = parseUnits(amount, decimals);
  const hexString = nativeToHexString(recipientAddress, targetChain);
  if (!hexString) {
    throw new Error('Invalid recipient');
  }
  const vaaCompatibleAddress = hexToUint8Array(hexString);

  const receipt = await transferFromEth(
    tokenBridgeAddress,
    signer,
    assetAddress,
    amountParsed,
    targetChain,
    vaaCompatibleAddress,
  );

  return await parseSequenceFromLogEth(
    receipt,
    coreBridgeAddress,
  );
};

const transferFromBSCToKarura = async (amount: string, sourceAsset: string, decimals = 18): string => {
  const sequence = await transferEvm(
    NODE_URL_BSC,
    BSC_TOKEN_BRIDGE_ADDRESS,
    BSC_CORE_BRIDGE_ADDRESS,
    CHAIN_ID_BSC,
    CHAIN_ID_KARURA,
    amount,
    relayerAddressKarura,
    sourceAsset,
    decimals,
  );
  console.log('transfer from BSC complete', { sequence }, 'waiting for VAA...');

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

const transferFromGoerliToKarura = async (amount: string, sourceAsset: string, decimals = 6): string => {
  const sequence = await transferEvm(
    NODE_URL_GOERLI,
    GOERLI_TOKEN_BRIDGE_ADDRESS,
    GOERLI_CORE_BRIDGE_ADDRESS,
    CHAIN_ID_ETH,
    CHAIN_ID_KARURA,
    amount,
    relayerAddressKarura,
    sourceAsset,
    decimals,
  );
  console.log('transfer from Goerli complete', { sequence }, 'waiting for VAA...');

  // poll until the guardian(s) witness and sign the vaa
  const emitterAddress = await getEmitterAddressEth(GOERLI_TOKEN_BRIDGE_ADDRESS);
  const { vaaBytes } = await getSignedVAAWithRetry(
    WORMHOLE_GUARDIAN_RPC,
    CHAIN_ID_ETH,
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
      const signedVAA = await transferFromBSCToKarura('0.1', BSC_USDT_ADDRESS);
      console.log({ signedVAA });

      const result = await axios.post(RELAY_URL, {
        targetChain: CHAIN_ID_KARURA,
        signedVAA,
      });

      expect(result.data).to.includes({
        from: relayerAddressKarura,
        to: KARURA_TOKEN_BRIDGE_ADDRESS,
        status: 1,
      });
    });

    it('throw correct error when transfer amount too small', async () => {
      const signedVAA = await transferFromBSCToKarura('0.01', BSC_USDT_ADDRESS);
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

  describe('Send ERC20 from Goerli to Karura', () => {
    it('relay correctly when should relay', async () => {
      const signedVAA = await transferFromGoerliToKarura('0.05', GOERLI_USDC_ADDRESS);
      console.log({ signedVAA });

      const result = await axios.post(RELAY_URL, {
        targetChain: CHAIN_ID_KARURA,
        signedVAA,
      });

      expect(result.data).to.includes({
        from: relayerAddressKarura,
        to: KARURA_TOKEN_BRIDGE_ADDRESS,
        status: 1,
      });
    });
  });
});
