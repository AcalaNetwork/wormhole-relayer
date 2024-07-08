import {
  CHAIN_ID_KARURA,
  ChainId,
  parseTransferPayload,
  parseVaa,
} from '@certusone/wormhole-sdk';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';

import { ChainConfig } from './configureEnv';
import { ROUTER_TOKEN_INFO_TESTNET, ZERO_ADDR } from '../consts';

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

export const getRouterChainTokenAddr = async (
  originAddr: string,
  chainConfig: ChainConfig,
): Promise<string> => {
  const routerTokenInfo = chainConfig.isTestnet
    ? ROUTER_TOKEN_INFO_TESTNET
    : ROUTER_TOKEN_INFO;

  const targetTokenInfo = Object.values(routerTokenInfo)
    .find(info => info.originAddr === originAddr);

  if (!targetTokenInfo) {
    return ZERO_ADDR;
  }

  const routerChainTokenInfo = targetTokenInfo[chainConfig.chainId === CHAIN_ID_KARURA ? 'karuraAddr' : 'acalaAddr'];
  if (!routerChainTokenInfo) {
    return ZERO_ADDR;
  }

  return routerChainTokenInfo;
};
