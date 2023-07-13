import {
  hexToUint8Array,
  redeemOnEth,
  parseTransferPayload,
  ChainId,
  tryNativeToHexString,
  transferFromEth,
  parseSequenceFromLogEth,
  tryHexToNativeString,
  parseVaa,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ERC20__factory, FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { BigNumber, BigNumberish, ContractReceipt, ethers, Signer, Wallet } from 'ethers';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';

import { ChainConfig } from './configureEnv';
import { GOERLI_USDC, RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS, ZERO_ADDR } from './consts';
import { logger } from './logger';
import { RelayAndRouteParams } from './route';
import { RelayError } from './middlewares/error';

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

export const parseVaaPayload = async (bytes: Uint8Array): Promise<VaaInfo> => {
  const parsedVaa = parseVaa(bytes);
  const payload = parseTransferPayload(parsedVaa.payload);

  return {
    amount: payload.amount,
    originAddress: payload.originAddress,
    originChain: payload.originChain as ChainId,
    targetAddress: payload.targetAddress,
    targetChain: payload.targetChain as ChainId,
  };
};

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
const VAA_MIN_DECIMALS = 8;
export const checkShouldRelayBeforeRouting = async (
  params: RelayAndRouteParams,
  chainConfig: ChainConfig,
  signer: Signer,
) => {
  const tokenBridge = Bridge__factory.connect(chainConfig.tokenBridgeAddr, signer);
  const feeRegistry = FeeRegistry__factory.connect(chainConfig.feeAddr, signer);

  const vaaInfo = await parseVaaPayload(hexToUint8Array(params.signedVAA));
  const {
    originAddress,
    amount,     // min(originAssetDecimal, 8)
    originChain,
  } = vaaInfo;

  const wrappedAddr = await tokenBridge.wrappedAsset(
    originChain,
    Buffer.from(tryNativeToHexString('0x' + originAddress, originChain), 'hex'),
  );

  const fee = await feeRegistry.getFee(wrappedAddr);
  if (fee.eq(0)) {
    throw new RelayError('unsupported token', { ...vaaInfo, amount: BigNumber.from(amount) });
  }

  const erc20 = ERC20__factory.connect(wrappedAddr, signer);
  const decimals = await erc20.decimals();
  const realAmount = decimals <= VAA_MIN_DECIMALS
    ? amount
    : BigNumber.from(amount).pow(decimals - VAA_MIN_DECIMALS);

  if (fee.gt(realAmount)) {
    throw new RelayError('token amount too small to relay', { ...vaaInfo, amount: BigNumber.from(amount) });
  }
};

export const relayEVM = async (
  chainConfig: ChainConfig,
  signedVAA: string,
): Promise<ContractReceipt> => {
  const signer = await getSigner(chainConfig);

  const receipt = await redeemOnEth(
    chainConfig.tokenBridgeAddr,
    signer,
    hexToUint8Array(signedVAA),
  );

  return receipt;
};

export const getSigner = async ({
  ethRpc,
  walletPrivateKey,
}: {
  ethRpc: string;
  walletPrivateKey: string;
}): Promise<Signer> => {
  const provider = new AcalaJsonRpcProvider(ethRpc);
  return new ethers.Wallet(walletPrivateKey, provider);
};

export const getRouterChainTokenAddr = async (
  originAddr: string,
  chainConfig: ChainConfig,
): Promise<string> => {
  if (chainConfig.isTestnet) {
    return originAddr === GOERLI_USDC
      ? '0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7'
      : ZERO_ADDR;
  }

  const targetTokenInfo = Object.values(ROUTER_TOKEN_INFO)
    .find((info) => info.originAddr === originAddr);

  if (!targetTokenInfo) {
    return ZERO_ADDR;
  }

  const routerChainTokenInfo = targetTokenInfo[chainConfig.chainId === CHAIN_ID_KARURA ? 'karuraAddr' : 'acalaAddr'];
  if (!routerChainTokenInfo) {
    return ZERO_ADDR;
  }

  return routerChainTokenInfo;
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
  const hexString = tryNativeToHexString(recipientAddr, targetChain);
  if (!hexString) {
    throw new Error('Invalid recipient');
  }
  const vaaCompatibleAddr = hexToUint8Array(hexString);

  console.log(`sending bridging tx with wallet ${signer.address} and amount ${amount} ...`);
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

export const testTimeout = async (request: any, response: any): Promise<void> => {
  const timeout = request.body.timeout ?? 120000;
  await new Promise(resolve => setTimeout(resolve, timeout));

  return response.status(200).json({
    msg: `${timeout} timeout ok`,
  });
};
