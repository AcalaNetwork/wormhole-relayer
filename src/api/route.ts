import { ChainId,  tryNativeToHexString } from '@certusone/wormhole-sdk';
import { Factory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { Signer } from 'ethers';
import { WormholeInstructionsStruct, XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';

import { ChainConfig, getChainConfig } from '../utils/configureEnv';
import {
  DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID,
  ROUTE_SUPPORTED_CHAINS_AND_ASSETS,
  ZERO_ADDR,
} from '../consts';
import { checkShouldRelayBeforeRouting, relayEVM } from '../utils/relay';
import { getRouterChainTokenAddr } from '../utils/wormhole';
import { getSigner } from '../utils/utils';
import { logger } from '../utils/logger';

interface RouteParamsBase {
  originAddr: string;     // origin token address
}

export interface RouteParamsWormhole extends RouteParamsBase {
  targetChainId: string;
  destAddr: string;       // recepient address in hex
  fromParaId: string;     // from parachain id in number
}

export interface RouteParamsXcm extends RouteParamsBase {
  destParaId: string;  // TODO: maybe can decode from dest
  dest: string;           // xcm encoded dest in hex
}

export interface RelayAndRouteParams extends RouteParamsXcm {
  signedVAA: string;
}

interface RouteProps {
  routerAddr: string;
  chainConfig: ChainConfig;
  signer: Signer;
}

interface RoutePropsXcm extends RouteProps {
  routerChainId: ChainId;
}

interface RoutePropsWormhole extends RouteProps {
  routerChainTokenAddr: string;
  wormholeInstructions: WormholeInstructionsStruct;
}

const _prepareRoute = async (routerChainId: ChainId) => {
  const chainConfig = getChainConfig(routerChainId);
  if (!chainConfig) {
    throw new Error(`unsupported routerChainId: ${routerChainId}`);
  }

  const signer = await getSigner(chainConfig);

  return {
    chainConfig,
    signer,
  };
};

const prepareRouteXcm = async ({
  dest,
  destParaId,
  originAddr,
}: RouteParamsXcm): Promise<RoutePropsXcm> => {
  const supportedTokens = ROUTE_SUPPORTED_CHAINS_AND_ASSETS[destParaId];
  if (!supportedTokens) {
    throw new Error(`unsupported dest parachain: ${destParaId}`);
  }

  if (!supportedTokens.map((t: string) => t.toLowerCase()).includes(originAddr.toLowerCase())) {
    throw new Error(`unsupported token on dest parachin ${destParaId}. Token origin address: ${originAddr}`);
  }

  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[destParaId] as ChainId;
  const {
    chainConfig,
    signer,
  } = await _prepareRoute(routerChainId);

  const weight = '0x00';    // unlimited
  const xcmInstruction = { dest, weight };

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployXcmRouter(chainConfig.feeAddr, xcmInstruction);

  return {
    routerAddr,
    chainConfig,
    signer,
    routerChainId,
  };
};

const prepareRouteWormhole = async ({
  originAddr,
  destAddr,
  fromParaId,
  targetChainId,
}: RouteParamsWormhole): Promise<RoutePropsWormhole> => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[fromParaId];
  if (!routerChainId) {
    throw new Error(`unsupported origin parachain: ${fromParaId}`);
  }

  const {
    chainConfig,
    signer,
  } = await _prepareRoute(routerChainId);

  const routerChainTokenAddr = await getRouterChainTokenAddr(originAddr, chainConfig);
  if (routerChainTokenAddr === ZERO_ADDR) {
    throw new Error(`origin token ${originAddr} not supported on router chain ${routerChainId}`);
  }

  const recipient = Buffer.from(tryNativeToHexString(destAddr, chainConfig.chainId), 'hex');
  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: targetChainId,
    recipient,
    nonce: 0,
    arbiterFee: 0,
  };

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployWormholeRouter(
    chainConfig.feeAddr,
    wormholeInstructions,
    chainConfig.tokenBridgeAddr,
  );

  return {
    routerAddr,
    chainConfig,
    signer,
    routerChainTokenAddr,
    wormholeInstructions,
  };
};

export const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<string> => {
  const { chainConfig, signer } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  const tx = await factory.connect(signer).deployXcmRouterAndRoute(
    chainConfig.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );

  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const relayAndRoute = async (params: RelayAndRouteParams): Promise<[string, string]> => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId] as ChainId;
  const { chainConfig, signer } = await _prepareRoute(routerChainId);
  await checkShouldRelayBeforeRouting(params, chainConfig, signer);

  const wormholeReceipt = await relayEVM(chainConfig, params.signedVAA);
  logger.debug({ txHash: wormholeReceipt.transactionHash }, 'relay finished');

  const xcmTxHash = await routeXcm(params);
  return [wormholeReceipt.transactionHash, xcmTxHash];
};

export const routeWormhole = async (routeParamsWormhole: RouteParamsWormhole): Promise<string> => {
  const {
    chainConfig,
    signer,
    routerChainTokenAddr,
    wormholeInstructions,
  } = await prepareRouteWormhole(routeParamsWormhole);

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const tx = await factory.deployWormholeRouterAndRoute(
    chainConfig.feeAddr,
    wormholeInstructions,
    chainConfig.tokenBridgeAddr,
    routerChainTokenAddr,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const shouldRouteXcm = async (data: any) =>  {
  try {
    const { routerAddr, routerChainId } = await prepareRouteXcm(data);
    return {
      shouldRoute: true,
      routerAddr,
      routerChainId,
    };
  } catch (error) {
    return {
      shouldRoute: false,
      msg: error.message,
    };
  }
};

export const shouldRouteWormhole = async (data: any) =>  {
  try {
    const { routerAddr } = await prepareRouteWormhole(data);
    return {
      shouldRoute: true,
      routerAddr,
    };
  } catch (error) {
    return {
      shouldRoute: false,
      msg: error.message,
    };
  }
};
