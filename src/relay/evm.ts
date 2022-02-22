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

const parseVaa = async (bytes: Uint8Array): Promise<VaaInfo> => {
  const { parse_vaa } = await importCoreWasm();
  const parsedVaa = parse_vaa(bytes);
  const buffered = Buffer.from(new Uint8Array(parsedVaa.payload));

  return parseTransferPayload(buffered);
};

// https://github.com/certusone/wormhole/blob/77ecc035a3e2dd7d6c86fb0ecedda5e1dbc66cda/sdk/js/src/utils/parseVaa.ts#L61
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

const shouldRelay = (vaaInfo: VaaInfo) => {
  const {
    targetChain: chainId,
    amount: vaaAmount,
    originAddress,
  } = vaaInfo;
  const address = `0x${originAddress.substring(originAddress.length - 40).toLowerCase()}`;
  const amount = normalizeVaaAmount(vaaAmount, TOKEN_DECIMALS[address]);

  const supported = RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[chainId] as any;
  if (!supported || !address || !amount) return false;

  const minTransfer = supported[address];
  const res = !!minTransfer && amount >= BigInt(minTransfer);

  console.log('check should relay: ', { chainId, address, amount, res });

  return res;
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
