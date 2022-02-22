import {
  // CHAIN_ID_KARURA,   // TODO: import from wormhole sdk after it published
  hexToUint8Array,
  redeemOnEth,
  parseTransferPayload,
  importCoreWasm,
  ChainId,
} from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { ChainConfigInfo } from '../configureEnv';
import { EvmRpcProvider } from '@acala-network/eth-providers';

interface VaaInfo {
  amount: bigint;
  originAddress: string;
  originChain: ChainId;
  targetAddress: string;
  targetChain: ChainId;
}

const parseVaa = async (bytes: Uint8Array): Promise<VaaInfo> => {
  const { parse_vaa } = await importCoreWasm();
  const parsedVaa = parse_vaa(bytes);
  const buffered = Buffer.from(new Uint8Array(parsedVaa.payload));

  return parseTransferPayload(buffered);
};

const SUPPORTED_ADDRESSES_AND_THRESHOLD = {
  '00000000000000000000000090f8bf6a479f320ead074411a4b0e7944ea8c9c1': 0.0001,
};
const shouldRelay = (vaaInfo: VaaInfo) => {
  return true;    // TODO: in production remove this

  // if (vaaInfo.targetChain !== CHAIN_ID_KARURA as any) return false;  // TODO: add this after importing CHAIN_ID_KARURA

  const minTransfer = SUPPORTED_ADDRESSES_AND_THRESHOLD[vaaInfo.targetAddress];
  return !!minTransfer && vaaInfo.amount > minTransfer;
};

const KARURA_ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://157.245.62.53:9944';
export async function relayEVM(
  chainConfigInfo: ChainConfigInfo,
  signedVAA: string,
  unwrapNative: boolean,
  request: any,
  response: any
) {
  const provider = EvmRpcProvider.from(KARURA_ENDPOINT_URL);
  await provider.isReady();

  const signer = new ethers.Wallet(chainConfigInfo.walletPrivateKey, provider);

  const vaaInfo = await parseVaa(hexToUint8Array(signedVAA));
  console.log('parsed VAA info: ', vaaInfo);

  if (!shouldRelay(vaaInfo)) {
    response.status(400).json({
      error: 'asset not supported or transfer amount too small',
      vaaInfo: {
        ...vaaInfo,
        amount: vaaInfo.amount.toString(),
      },
    });
  }

  const receipt = await redeemOnEth(
    chainConfigInfo.tokenBridgeAddress,
    signer,
    hexToUint8Array(signedVAA)
  );

  console.log('successfully redeemed on evm', receipt);
  response.status(200).json(receipt);
}
