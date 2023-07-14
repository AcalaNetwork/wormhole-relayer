import {
  hexToUint8Array,
  parseTransferPayload,
  ChainId,
  tryNativeToHexString,
  transferFromEth,
  parseSequenceFromLogEth,
  parseVaa,
  CHAIN_ID_KARURA,
  getEmitterAddressEth,
  getSignedVAAWithRetry,
  uint8ArrayToHex,
} from '@certusone/wormhole-sdk';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { BigNumberish, ContractReceipt, Wallet } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

import { ChainConfig } from './configureEnv';
import { GOERLI_USDC, WORMHOLE_GUARDIAN_RPC, ZERO_ADDR } from '../consts';

export interface VaaInfo {
  amount: bigint;
  originAddress: string;
  originChain: ChainId;
  targetAddress: string;
  targetChain: ChainId;
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

export const getSignedVAAFromSequence = async (
  sequence: string,
  chainId: ChainId,
  tokenBridgeAddr: string,
  isMainnet = false,
) => {
  const guardianRpc = isMainnet
    ? WORMHOLE_GUARDIAN_RPC.MAINNET
    : WORMHOLE_GUARDIAN_RPC.TESTNET;
  const emitterAddress = getEmitterAddressEth(tokenBridgeAddr);
  const { vaaBytes } = await getSignedVAAWithRetry(
    guardianRpc,
    chainId,
    emitterAddress,
    sequence,
    { transport: NodeHttpTransport() },
  );

  return uint8ArrayToHex(vaaBytes);
};
