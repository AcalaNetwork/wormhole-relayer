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

// const BSC_NODE_URL = 'ws://157.245.62.53:8546';
// const BSC_PRIVATE_KEY = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
// const RELAYER_WALLET_ADDRESS = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
// const BSC_CORE_BRIDGE_ADDRESS ='0xC89Ce4735882C9F0f0FE26686c53074E09B0D550';
// const BSC_TOKEN_BRIDGE_ADDRESS = '0x0290FB167208Af455bB137780163b7B7a9a10C16';

const BSC_NODE_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BSC_PRIVATE_KEY = '0xefb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044';
const RELAYER_WALLET_ADDRESS = '0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3';
const BSC_CORE_BRIDGE_ADDRESS = '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D';
const BSC_TOKEN_BRIDGE_ADDRESS = '0x9dcF9D205C9De35334D646BeE44b2D2859712A09';
const KARURA_TOKEN_BRIDGE_ADDRESS = '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37';

// const WBSC_ADDRESS = '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';
// const ERC20_ADDRESS = '0x2D8BE6BF0baA74e0A907016679CaE9190e80dD0A';
const ERC20_ADDRESS = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';     // BSC USDT
const NOT_SUPPORTED_ADDRESS = '';

// const WORMHOLE_GUARDIAN_RPC = ['http://157.245.62.53:7071'];
const WORMHOLE_GUARDIAN_RPC = ['https://wormhole-v2-testnet-api.certus.one'];
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

const transferFromBSCToKarura = async (amount: string, originTokenAddress: string, decimals = 18): string => {
  const sequence = await transferEvm(
    CHAIN_ID_BSC,
    CHAIN_ID_KARURA,
    amount,
    RELAYER_WALLET_ADDRESS,
    originTokenAddress,
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

      const result = await axios.post(RELAYER_URL, {
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
        await axios.post(RELAYER_URL, {
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
        await axios.post(RELAYER_URL, {
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
