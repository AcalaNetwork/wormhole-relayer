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
import axios, { AxiosError } from 'axios';
import { expect } from 'chai';

const BSC_NODE_URL = 'ws://157.245.62.53:8546';
const BSC_PRIVATE_KEY =
  '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
const EVM_WHALE_ADDRESS = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
const BSC_CORE_BRIDGE_ADDRESS =
  '0xC89Ce4735882C9F0f0FE26686c53074E09B0D550';
const BSC_TOKEN_BRIDGE_ADDRESS =
  '0x0290FB167208Af455bB137780163b7B7a9a10C16';

const WBSC_ADDRESS = '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
const ERC20_ADDRESS = '0x2D8BE6BF0baA74e0A907016679CaE9190e80dD0A';
const NOT_SUPPORTED_ADDRESS = '';

const WORMHOLE_RPC_HOSTS = ['http://157.245.62.53:7071'];
const RELAYER_URL = 'http://localhost:3111/relay';

setDefaultWasm('node');

const transferEvm = async (
  sourceChain: ChainId,
  targetChain: ChainId,
  amount: string,
  recipientAddress: string,
  assetAddress: string,
  decimals: number,
): Promise<string> => {
  const provider = new ethers.providers.WebSocketProvider(BSC_NODE_URL) as any;
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

const transferFromBSCToKarura = async (amount: string, originTokenAddress: string, decimals = 18): string => {
  const sequence = await transferEvm(
    CHAIN_ID_BSC,
    CHAIN_ID_KARURA,
    amount,
    EVM_WHALE_ADDRESS,
    originTokenAddress,
    decimals,
  );

  // poll until the guardian(s) witness and sign the vaa
  const emitterAddress = await getEmitterAddressEth(BSC_TOKEN_BRIDGE_ADDRESS);
  const { vaaBytes } = await getSignedVAAWithRetry(
    WORMHOLE_RPC_HOSTS,
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
      const signedVAA = await transferFromBSCToKarura('1.5', ERC20_ADDRESS);
      console.log({ signedVAA });

      const result = await axios.post(RELAYER_URL, {
        chainId: CHAIN_ID_KARURA,
        signedVAA,
      });

      expect(result.data).to.includes({
        from: EVM_WHALE_ADDRESS,
        to: BSC_TOKEN_BRIDGE_ADDRESS,
        status: 1,
      });
    });

    it('throw correct error when transfer amount too small', async () => {
      const signedVAA = await transferFromBSCToKarura('0.01', ERC20_ADDRESS);
      console.log({ signedVAA });

      let failed = false;
      try {
        await axios.post(RELAYER_URL, {
          chainId: CHAIN_ID_KARURA,
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
        await axios.post(RELAYER_URL, {
          chainId: CHAIN_ID_KARURA,
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
