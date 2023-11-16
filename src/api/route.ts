import { DOT } from '@acala-network/contracts/utils/AcalaTokens';
import { Factory__factory, HomaFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';
import { evmToAddr32, nativeToAddr32 } from '@acala-network/asset-router/dist/utils';

import {
  DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID,
} from '../consts';
import {
  Mainnet,
  RelayAndRouteParams,
  RouteParamsHoma,
  RouteParamsWormhole,
  RouteParamsXcm,
  _populateRelayTx,
  _populateRouteTx,
  checkShouldRelayBeforeRouting,
  getChainConfig,
  getEthExtrinsic,
  getMainnetChainId,
  getRouterChainTokenAddr,
  logger,
  prepareRouteWormhole,
  prepareRouteXcm,
  relayEVM,
  sendExtrinsic,
  toAddr32,
} from '../utils';
import { isEvmAddress, isSubstrateAddress } from '@acala-network/eth-providers';

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

export const relayAndRouteBatch = async (params: RelayAndRouteParams): Promise<string> => {
  const [relayTx, routeTx] = await Promise.all([
    _populateRelayTx(params),
    _populateRouteTx(params),
  ]);

  const routerChainId = DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID[params.destParaId];
  const { api, provider, relayerSubstrateAddr } = await getChainConfig(routerChainId);

  const [relayExtrinsic, routeExtrinsic] = await Promise.all([
    getEthExtrinsic(api, provider, relayTx, false),
    getEthExtrinsic(api, provider, routeTx, true),
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
  } catch (err) {
    return {
      shouldRoute: false,
      msg: err.message,
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
  } catch (err) {
    return {
      shouldRoute: false,
      msg: err.message,
    };
  }
};

const prepareRouteHoma = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, homaFactoryAddr, wallet } = chainConfig;

  const homaFactory = HomaFactory__factory.connect(homaFactoryAddr!, wallet);

  return { homaFactory, feeAddr };
};

export const shouldRouteHoma = async ({ chain, destAddr }: RouteParamsHoma) =>  {
  try {
    const { homaFactory, feeAddr } = await prepareRouteHoma(chain);
    const routerAddr = await homaFactory.callStatic.deployHomaRouter(
      feeAddr,
      toAddr32(destAddr),
    );

    return {
      shouldRoute: true,
      routerAddr,
    };
  } catch (err) {
    return {
      shouldRoute: false,
      msg: err.message,
    };
  }
};

export const routeHoma = async ({ chain, destAddr }: RouteParamsHoma) =>  {
  const { homaFactory, feeAddr } = await prepareRouteHoma(chain);
  const tx = await homaFactory.deployHomaRouterAndRoute(feeAddr, toAddr32(destAddr), DOT);
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
