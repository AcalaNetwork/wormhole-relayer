import { BigNumber, ContractReceipt } from 'ethers';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ERC20__factory, FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import {
  hexToUint8Array,
  redeemOnEth,
  tryHexToNativeString,
  tryNativeToHexString,
} from '@certusone/wormhole-sdk';

import { ChainConfig } from './configureEnv';
import { RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS } from '../consts';
import { RelayAndRouteParams } from './validate';
import { RelayError } from '../middlewares/error';
import { VaaInfo, parseVaaPayload } from './wormhole';
import { logger } from './logger';

interface ShouldRelayResult {
  shouldRelay: boolean;
  msg: string;
}

export const shouldRelayVaa = (vaaInfo: VaaInfo): ShouldRelayResult => {
  const {
    amount,
    targetChain,
    originChain,
    originAddress,
  } = vaaInfo;
  const originAsset = tryHexToNativeString(originAddress, originChain);

  const res = shouldRelay({ targetChain, originAsset, amount });

  logger.debug({ targetChain, originAsset, amount, res }, 'check should relay VAA');

  return res;
};

// for /relay endpoint
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

// for /relayAndRoute endpoint
const VAA_MAX_DECIMALS = 8;
export const checkShouldRelayBeforeRouting = async (
  params: RelayAndRouteParams,
  chainConfig: ChainConfig,
) => {
  const { tokenBridgeAddr, feeAddr, wallet } = chainConfig;
  const tokenBridge = Bridge__factory.connect(tokenBridgeAddr, wallet);
  const feeRegistry = FeeRegistry__factory.connect(feeAddr, wallet);

  const vaaInfo = await parseVaaPayload(hexToUint8Array(params.signedVAA));
  const {
    originAddress,
    amount: vaaAmount,     // min(originDecimal, VAA_MAX_DECIMALS)
    originChain,
  } = vaaInfo;

  const wrappedAddr = await tokenBridge.wrappedAsset(
    originChain,
    Buffer.from(tryNativeToHexString('0x' + originAddress, originChain), 'hex'),
  );

  const fee = await feeRegistry.getFee(wrappedAddr);
  if (fee.eq(0)) {
    throw new RelayError('unsupported token', { ...vaaInfo, amount: BigNumber.from(vaaAmount) });
  }

  const erc20 = ERC20__factory.connect(wrappedAddr, wallet);
  const originDecimals = await erc20.decimals();
  const realAmount = originDecimals <= VAA_MAX_DECIMALS
    ? vaaAmount
    : BigNumber.from(10).pow(originDecimals - VAA_MAX_DECIMALS).mul(vaaAmount);

  if (fee.gt(realAmount)) {
    throw new RelayError('token amount too small to relay', { ...vaaInfo, amount: BigNumber.from(vaaAmount) });
  }
};

export const relayEVM = async (
  chainConfig: ChainConfig,
  signedVAA: string,
): Promise<ContractReceipt> => {
  const receipt = await redeemOnEth(
    chainConfig.tokenBridgeAddr,
    chainConfig.wallet,
    hexToUint8Array(signedVAA),
  );

  return receipt;
};
