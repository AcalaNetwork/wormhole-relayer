import {
  hexToUint8Array,
  redeemOnEth,
  parseTransferPayload,
  importCoreWasm,
  ChainId,
  hexToNativeString,
  Bridge__factory,
  nativeToHexString,
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
  transferFromEth,
  parseSequenceFromLogEth,
  CHAIN_ID_ETH,
} from '@certusone/wormhole-sdk';
import { BigNumber, BigNumberish, ContractReceipt, ethers, Signer, Wallet } from 'ethers';
import { ChainConfigInfo } from './configureEnv';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import {
  RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS,
} from './consts';
import { parseUnits } from 'ethers/lib/utils';

interface VaaInfo {
  amount: bigint;
  originAddress: string;
  originChain: ChainId;
  targetAddress: string;
  targetChain: ChainId;
}
interface ShouldRelayResult {
  shouldRelay: boolean;
  msg: string;
}

export const parseVaa = async (bytes: Uint8Array): Promise<VaaInfo> => {
  const { parse_vaa } = await importCoreWasm();
  const parsedVaa = parse_vaa(bytes);
  const buffered = Buffer.from(new Uint8Array(parsedVaa.payload));

  return parseTransferPayload(buffered);
};

export const shouldRelayVaa = (vaaInfo: VaaInfo): ShouldRelayResult => {
  const {
    amount,
    targetChain,
    originChain,
    originAddress,
  } = vaaInfo;
  const originAsset = hexToNativeString(originAddress, originChain) as string;  // TODO: update

  const res = shouldRelay({ targetChain, originAsset, amount });

  const info = JSON.stringify({ targetChain, originAsset, amount, res }, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  console.log(`check should relay VAA: ${info}`);

  return res;
};

export const shouldRelay = ({
  targetChain,
  originAsset,
  amount: _amount,
}: {
  targetChain: number;
  originAsset: string;
  amount: bigint;
}): ShouldRelayResult => {
  const _noRelay = (msg: string): ShouldRelayResult => ({ shouldRelay: false, msg });

  if (!targetChain) return _noRelay('missing targetChain');
  if (!originAsset) return _noRelay('missing originAsset');
  if (!_amount) return _noRelay('missing transfer amount');

  let amount: bigint;
  try {
    amount = BigInt(_amount);
  } catch (e) {
    return _noRelay(`failed to parse amount: ${_amount}`);
  }

  const supported = RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain];
  if (!supported) return _noRelay('target chain not supported');

  const minTransfer = supported[originAsset.toLowerCase()];
  if (!minTransfer) return _noRelay('token not supported');
  if (amount < BigInt(minTransfer)) return _noRelay(`transfer amount too small, expect at least ${minTransfer}`);

  return { shouldRelay: true, msg: '' };
};

export const relayEVM = async (
  chainConfigInfo: ChainConfigInfo,
  signedVAA: string,
): Promise<ContractReceipt> => {
  const signer = await getSigner(chainConfigInfo);

  const receipt = await redeemOnEth(
    chainConfigInfo.tokenBridgeAddr,
    signer,
    hexToUint8Array(signedVAA),
  );

  await (signer.provider as EvmRpcProvider).disconnect();

  return receipt;
};

export const getSigner = async ({
  nodeUrl,
  walletPrivateKey,
}: {
  nodeUrl: string;
  walletPrivateKey: string;
}): Promise<Signer> => {
  const provider = EvmRpcProvider.from(nodeUrl);
  await provider.isReady();

  return new ethers.Wallet(walletPrivateKey, provider);
};

export const getRouterChainTokenAddr = async (originAddr: string, chainInfo: ChainConfigInfo): Promise<string> => {
  const signer = await getSigner(chainInfo);
  const tokenBridge = Bridge__factory.connect(chainInfo.tokenBridgeAddr, signer);

  return tokenBridge.wrappedAsset(
    CHAIN_ID_ETH,
    Buffer.from(nativeToHexString(originAddr, CHAIN_ID_ETH) as string, 'hex'),   // TODO: use tryNativeToHexString
  );
};

export const bridgeToken = async (
  signer: Wallet,
  tokenBridgeAddr: string,
  coreBridgeAddr: string,
  recipientAddr: string,
  sourceAssetAddr: string,
  targetChain: ChainId,
  amount: BigNumberish,
): Promise<{
  receipt: ContractReceipt;
  sequence: string;
}> => {
  const hexString = nativeToHexString(recipientAddr, targetChain);
  if (!hexString) {
    throw new Error('Invalid recipient');
  }
  const vaaCompatibleAddr = hexToUint8Array(hexString);

  console.log('sending bridging tx...');
  const receipt = await transferFromEth(
    tokenBridgeAddr,
    signer,
    sourceAssetAddr,
    amount,
    targetChain,
    vaaCompatibleAddr,
  );

  const sequence = parseSequenceFromLogEth(receipt, coreBridgeAddr);

  return {
    receipt,
    sequence,
  };
};
