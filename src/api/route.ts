import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { Factory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';
import { hexToUint8Array } from '@certusone/wormhole-sdk';

import {
  DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID,
} from '../consts';
import {
  RelayAndRouteParams,
  RouteParamsWormhole,
  RouteParamsXcm,
  checkShouldRelayBeforeRouting,
  getChainConfig,
  getEthExtrinsic,
  getRouterChainTokenAddr,
  logger,
  prepareRouteWormhole,
  prepareRouteXcm,
  relayEVM,
  sendExtrinsic,
} from '../utils';

export const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<string> => {
  const { chainConfig } = await prepareRouteXcm(routeParamsXcm);
  const { feeAddr, factoryAddr, wallet } = chainConfig;

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(factoryAddr, wallet);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  const tx = await factory.deployXcmRouterAndRoute(
    feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );

  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const _populateRelayTx = async (params: RelayAndRouteParams) => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId];
  const chainConfig = await getChainConfig(routerChainId);
  const { tokenBridgeAddr, wallet } = chainConfig;

  await checkShouldRelayBeforeRouting(params, chainConfig);

  const bridge = Bridge__factory.connect(tokenBridgeAddr, wallet);
  return await bridge.populateTransaction.completeTransfer(hexToUint8Array(params.signedVAA));
};

export const _populateRouteTx = async (routeParamsXcm: RelayAndRouteParams) => {
  const { chainConfig } = await prepareRouteXcm(routeParamsXcm);
  const { factoryAddr, feeAddr, wallet } = chainConfig;

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(factoryAddr, wallet);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  return await factory.populateTransaction.deployXcmRouterAndRoute(
    feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );
};

export const relayAndRouteBatch = async (params: RelayAndRouteParams): Promise<string> => {
  const [relayTx, routeTx] = await Promise.all([
    _populateRelayTx(params),
    _populateRouteTx(params),
  ]);

  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId];
  const { api, provider, relayerSubstrateAddr } = await getChainConfig(routerChainId);

  const [relayExtrinsic, routeExtrinsic] = await Promise.all([
    getEthExtrinsic(api, provider, relayTx),
    getEthExtrinsic(api, provider, routeTx),
  ]);

  const batchTx = api.tx.utility.batchAll([relayExtrinsic, routeExtrinsic]);
  await batchTx.signAsync(relayerSubstrateAddr);

  const txHash = await sendExtrinsic(api, provider, batchTx);

  return txHash;
};

export const relayAndRoute = async (params: RelayAndRouteParams): Promise<[string, string]> => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId];
  const chainConfig = await getChainConfig(routerChainId);
  await checkShouldRelayBeforeRouting(params, chainConfig);

  const wormholeReceipt = await relayEVM(chainConfig, params.signedVAA);
  logger.debug({ txHash: wormholeReceipt.transactionHash }, 'relay finished');

  const xcmTxHash = await routeXcm(params);
  return [wormholeReceipt.transactionHash, xcmTxHash];
};

export const routeWormhole = async (routeParamsWormhole: RouteParamsWormhole): Promise<string> => {
  const {
    chainConfig,
    routerChainTokenAddr,
    wormholeInstructions,
  } = await prepareRouteWormhole(routeParamsWormhole);
  const { feeAddr, tokenBridgeAddr, factoryAddr, wallet } = chainConfig;

  const factory = Factory__factory.connect(factoryAddr, wallet);
  const tx = await factory.deployWormholeRouterAndRoute(
    feeAddr,
    wormholeInstructions,
    tokenBridgeAddr,
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
