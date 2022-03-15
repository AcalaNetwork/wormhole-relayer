import {
  hexToUint8Array,
  redeemOnEth,
  parseTransferPayload,
  importCoreWasm,
  ChainId,
} from '@certusone/wormhole-sdk';
import { ethers } from 'ethers';
import { ChainConfigInfo } from '../configureEnv';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { formatUnits, parseUnits } from 'ethers/lib/utils';
import {
  RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS,
  TOKEN_DECIMALS,
} from './consts';

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

/* https://github.com/certusone/wormhole/blob/77ecc035a3e2dd7d6c86fb0ecedda5e1dbc66cda/sdk/js/src/utils/parseVaa.ts#L61 */
const normalizeVaaAmount = (
  amount: bigint,
  assetDecimals: number
): bigint => {
  const MAX_VAA_DECIMALS = 8;
  if (assetDecimals <= MAX_VAA_DECIMALS) {
    return amount;
  }
  const decimalStringVaa = formatUnits(amount, MAX_VAA_DECIMALS);
  const normalizedAmount = parseUnits(decimalStringVaa, assetDecimals);
  const normalizedBigInt = BigInt(truncate(normalizedAmount.toString(), 0));

  return normalizedBigInt;
};

const truncate = (str: string, maxDecimalDigits: number) => {
  if (str.includes('.')) {
    const parts = str.split('.');
    return parts[0] + '.' + parts[1].slice(0, maxDecimalDigits);
  }
  return str;
};
/* ---------------------------------------------------------------------------------------------------------------------- */

export const parseVaa = async (bytes: Uint8Array): Promise<VaaInfo> => {
  const { parse_vaa } = await importCoreWasm();
  const parsedVaa = parse_vaa(bytes);
  const buffered = Buffer.from(new Uint8Array(parsedVaa.payload));

  return parseTransferPayload(buffered);
};

export const shouldRelayVaa = (vaaInfo: VaaInfo): ShouldRelayResult => {
  const {
    amount: vaaAmount,
    targetChain,
    originAddress,
  } = vaaInfo;
  const sourceAsset = `0x${originAddress.substring(originAddress.length - 40).toLowerCase()}`;
  const amount = normalizeVaaAmount(vaaAmount, TOKEN_DECIMALS[sourceAsset]);

  const res = shouldRelay({ targetChain, sourceAsset, amount });

  console.log('should relay: ', { targetChain, sourceAsset, amount, res });
  return res;
};

export const shouldRelay = ({
  targetChain,
  sourceAsset,
  amount,
}: {
  targetChain: number;
  sourceAsset: string;
  amount: bigint;
}): ShouldRelayResult => {
  const _noRelay = (msg: string): ShouldRelayResult => ({ shouldRelay: false, msg });

  if (!targetChain) return _noRelay('missing targetChain');
  if (!sourceAsset) return _noRelay('missing sourceAsset');
  if (!amount) return _noRelay('missing transfer amount');

  const supported = RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[targetChain] as any;
  if (!supported) return _noRelay('target chain not supported');

  const minTransfer = supported[sourceAsset.toLowerCase()];
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
    // doesn't seem to need it
    // {
    //   'gasPrice': '0x2f955803ea',
    //   'gasLimit': '0x6fc3540'
    // }
  );

  console.log('successfully redeemed on evm', receipt);
  response.status(200).json(receipt);
};
