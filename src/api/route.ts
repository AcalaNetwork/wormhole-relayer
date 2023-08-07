import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ChainId,  hexToUint8Array } from '@certusone/wormhole-sdk';
import { Factory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';

import {
  DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID,
} from '../consts';
import {
  RelayAndRouteParams,
  RouteParamsWormhole,
  RouteParamsXcm,
  _prepareRoute,
  checkShouldRelayBeforeRouting,
  getApi,
  getEthExtrinsic,
  getRouterChainTokenAddr,
  getSigner,
  logger,
  prepareRouteWormhole,
  prepareRouteXcm,
  relayEVM,
  sendExtrinsic,
} from '../utils';

export const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<string> => {
  const { chainConfig, signer } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  const tx = await factory.deployXcmRouterAndRoute(
    chainConfig.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );

  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const _populateRelayTx = async (params: RelayAndRouteParams) => {
  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId] as ChainId;
  const { chainConfig, signer } = await _prepareRoute(routerChainId);
  await checkShouldRelayBeforeRouting(params, chainConfig, signer);

  const bridge = Bridge__factory.connect(chainConfig.tokenBridgeAddr, signer);
  return await bridge.populateTransaction.completeTransfer(hexToUint8Array(params.signedVAA));
};

export const _populateRouteTx = async (routeParamsXcm: RelayAndRouteParams) => {
  const { chainConfig, signer } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  return await factory.populateTransaction.deployXcmRouterAndRoute(
    chainConfig.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );
};

export const relayAndRouteBatch = async (params: RelayAndRouteParams): Promise<string> => {
  const [relayTx, routeTx] = await Promise.all([
    _populateRelayTx(params),
    _populateRouteTx(params),
  ]);

  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId] as ChainId;
  const { chainConfig } = await _prepareRoute(routerChainId);

  const [
    { addr, api },
    signer,
  ] = await Promise.all([
    getApi(chainConfig),
    getSigner(chainConfig),
  ]);
  const provider = signer.provider! as JsonRpcProvider;

  const [relayExtrinsic, routeExtrinsic] = await Promise.all([
    getEthExtrinsic(api, provider, relayTx),
    getEthExtrinsic(api, provider, routeTx),
  ]);

  const batchTx = api.tx.utility.batchAll([relayExtrinsic, routeExtrinsic]);
  await batchTx.signAsync(addr);

  const txHash = await sendExtrinsic(api, provider, batchTx);

  return txHash;
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
