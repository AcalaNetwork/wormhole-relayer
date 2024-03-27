import { Factory__factory } from '@acala-network/asset-router/dist/typechain-types';

import {
  RouteParamsWormhole,
  _populateRelayTx,
  _populateRouteTx,
  prepareRouteWormhole,
} from '../utils';

export const shouldRouteWormhole = async (data: any) => {
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
