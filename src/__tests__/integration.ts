import {
  getEmitterAddressEth,
  hexToUint8Array,
  nativeToHexString,
  transferFromEth,
  uint8ArrayToHex,
  CHAIN_ID_ETH,
  CHAIN_ID_KARURA,
  parseSequenceFromLogEth,
  ChainId,
} from '@certusone/wormhole-sdk';
import getSignedVAAWithRetry from '@certusone/wormhole-sdk/lib/cjs/rpc/getSignedVAAWithRetry';
import { setDefaultWasm } from '@certusone/wormhole-sdk/lib/cjs/solana/wasm';
import { parseUnits } from '@ethersproject/units';
import { ethers } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import { jest, test } from '@jest/globals';
import axios from 'axios';

// see devnet.md
const ETH_NODE_URL = 'http://188.166.208.240:8545';
const ETH_PRIVATE_KEY =
  '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
const EVM_WHALE_ADDRESS = '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
const ETH_CORE_BRIDGE_ADDRESS =
  '0xC89Ce4735882C9F0f0FE26686c53074E09B0D550';
const ETH_TOKEN_BRIDGE_ADDRESS =
  '0x0290FB167208Af455bB137780163b7B7a9a10C16';

const WETH_ADDRESS = '0xDDb64fE46a91D46ee29420539FC25FD07c5FEa3E';

const WORMHOLE_RPC_HOSTS = ['http://188.166.208.240:7071'];
const RELAYER_URL = 'http://localhost:3111/relay';

export async function transferEvm(
  sourceChain: ChainId,
  targetChain: ChainId,
  amount: string,
  recipientAddress: string,
  assetAddress: string,
  decimals: number,
): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(ETH_NODE_URL) as any;
  const signer = new ethers.Wallet(ETH_PRIVATE_KEY, provider);

  const amountParsed = parseUnits(amount, decimals);
  const hexString = nativeToHexString(recipientAddress, targetChain);
  if (!hexString) {
    throw new Error('Invalid recipient');
  }
  const vaaCompatibleAddress = hexToUint8Array(hexString);

  console.log('transferFromEth:', {
    assetAddress,
    amountParsed: amountParsed.toBigInt(),
    targetChain,
    vaaCompatibleAddress,
  });

  const receipt = await transferFromEth(
    ETH_TOKEN_BRIDGE_ADDRESS,
    signer,
    assetAddress,
    amountParsed,
    targetChain,
    vaaCompatibleAddress
  );

  return await parseSequenceFromLogEth(
    receipt,
    ETH_TOKEN_BRIDGE_ADDRESS,
  );
}

setDefaultWasm('node');

jest.setTimeout(60000);

test('Send WETH from ETH to Karura', (done) => {
  (async () => {
    try {
      // get the sequence from the logs (needed to fetch the vaa)
      const sequence = await transferEvm(
        CHAIN_ID_ETH,
        CHAIN_ID_KARURA,
        '0.0001',
        EVM_WHALE_ADDRESS,
        WETH_ADDRESS,
        18,
      );

      // poll until the guardian(s) witness and sign the vaa
      const emitterAddress = await getEmitterAddressEth(ETH_TOKEN_BRIDGE_ADDRESS);
      console.log({ emitterAddress });
      const { vaaBytes: signedVAA } = await getSignedVAAWithRetry(
        WORMHOLE_RPC_HOSTS,
        CHAIN_ID_ETH,
        emitterAddress,
        sequence,
        {
          transport: NodeHttpTransport(),
        }
      );

      const result = await axios.post(RELAYER_URL, {
        chainId: CHAIN_ID_KARURA,
        signedVAA: uint8ArrayToHex(signedVAA),
      });
      console.log(result);
      done();
    } catch (e) {
      console.error(e);
      done('An error occurred while trying to send from Solana to Ethereum');
    }
  })();
});
