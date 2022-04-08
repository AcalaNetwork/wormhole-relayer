import {
  hexToUint8Array,
  redeemOnEth,
  parseTransferPayload,
  importCoreWasm,
  ChainId,
  hexToNativeString,
} from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { ChainConfigInfo } from '../configureEnv';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import {
  RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS,
} from './consts';
import axios from 'axios';
import { formatEther } from 'ethers/lib/utils';

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
  const originAsset = hexToNativeString(originAddress, originChain);

  const res = shouldRelay({ targetChain, originAsset, amount });

  console.log('should relay: ', { targetChain, originAsset, amount, res });
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
  request: any,
  response: any
) => {
  const provider = EvmRpcProvider.from(chainConfigInfo.substrateNodeUrl);
  await provider.isReady();

  const signer = new ethers.Wallet(chainConfigInfo.walletPrivateKey, provider);

  const receipt = await redeemOnEth(
    chainConfigInfo.tokenBridgeAddress,
    signer,
    hexToUint8Array(signedVAA),
  );

  console.log('successfully redeemed on evm', receipt);
  response.status(200).json(receipt);
};

export const fetchBalance = async (address: string, url: string): Promise<number> => {
  try {
    const response = await axios.get(url, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [
          address,
          'latest',
        ],
      }
    });

    return Number(formatEther(response.data.result));
  } catch (e) {
    console.log('fetchBalance error: ', e);
    return -1;
  }
};
