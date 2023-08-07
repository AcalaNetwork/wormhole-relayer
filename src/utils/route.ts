import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ChainId, hexToUint8Array, tryNativeToHexString } from '@certusone/wormhole-sdk';
import { Factory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { WormholeInstructionsStruct, XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';

import { ChainConfig, getChainConfig } from '../utils/configureEnv';
import {
  DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID,
  ROUTE_SUPPORTED_CHAINS_AND_ASSETS,
  ZERO_ADDR,
} from '../consts';
import {
  RelayAndRouteParams,
  RouteParamsWormhole,
  RouteParamsXcm,
  checkShouldRelayBeforeRouting,
  getRouterChainTokenAddr,
} from '../utils';

interface RouteProps {
  routerAddr: string;
  chainConfig: ChainConfig;
}

interface RoutePropsXcm extends RouteProps {
  routerChainId: ChainId;
}

interface RoutePropsWormhole extends RouteProps {
  routerChainTokenAddr: string;
  wormholeInstructions: WormholeInstructionsStruct;
}

export const prepareRouteXcm = async ({
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

  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[destParaId];
  const chainConfig = await getChainConfig(routerChainId);

  const weight = '0x00';    // unlimited
  const xcmInstruction = { dest, weight };

  const factory = Factory__factory.connect(chainConfig.factoryAddr, chainConfig.wallet);
  const routerAddr = await factory.callStatic.deployXcmRouter(chainConfig.feeAddr, xcmInstruction);

  return {
    routerAddr,
    chainConfig,
    routerChainId,
  };
};

export const prepareRouteWormhole = async ({
  originAddr,
  destAddr,
  fromParaId,
  targetChainId,
}: RouteParamsWormhole): Promise<RoutePropsWormhole> => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[fromParaId];
  if (!routerChainId) {
    throw new Error(`unsupported origin parachain: ${fromParaId}`);
  }

  const chainConfig = await getChainConfig(routerChainId);

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

  const factory = Factory__factory.connect(chainConfig.factoryAddr, chainConfig.wallet);
  const routerAddr = await factory.callStatic.deployWormholeRouter(
    chainConfig.feeAddr,
    wormholeInstructions,
    chainConfig.tokenBridgeAddr,
  );

  return {
    routerAddr,
    chainConfig,
    routerChainTokenAddr,
    wormholeInstructions,
  };
};

export const _populateRelayTx = async (params: RelayAndRouteParams) => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId];
  const chainConfig = await getChainConfig(routerChainId);
  await checkShouldRelayBeforeRouting(params, chainConfig);

  const bridge = Bridge__factory.connect(chainConfig.tokenBridgeAddr, chainConfig.wallet);
  return await bridge.populateTransaction.completeTransfer(hexToUint8Array(params.signedVAA));
};

export const _populateRouteTx = async (routeParamsXcm: RelayAndRouteParams) => {
  const { chainConfig } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfig.factoryAddr, chainConfig.wallet);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  return await factory.populateTransaction.deployXcmRouterAndRoute(
    chainConfig.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );
};
