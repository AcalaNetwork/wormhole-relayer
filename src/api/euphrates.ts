import { EuphratesFactory__factory } from '@acala-network/asset-router/dist/typechain-types';

import { EUPHRATES_ADDR, EUPHRATES_POOLS } from '../consts';
import {
  Mainnet,
  RouteParamsEuphrates,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
} from '../utils';
import { RelayerError } from '../middlewares';

const prepareRouteEuphrates = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, euphratesFactoryAddr, wallet } = chainConfig;

  const euphratesFactory = EuphratesFactory__factory.connect(euphratesFactoryAddr!, wallet);

  return { euphratesFactory, feeAddr };
};

export const shouldRouteEuphrates = async (params: RouteParamsEuphrates) => {
  try {
    const { euphratesFactory, feeAddr } = await prepareRouteEuphrates(Mainnet.Acala);
    if (!EUPHRATES_POOLS.includes(params.poolId)) {
      throw new RelayerError(`euphrates poolId ${params.poolId} is not supported`, params);
    }

    const routerAddr = await euphratesFactory.callStatic.deployEuphratesRouter(
      feeAddr,
      params,
      EUPHRATES_ADDR,
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

export const routeEuphrates = async (params: RouteParamsEuphrates) => {
  if (params.token === undefined) {
    throw new RelayerError('no token address provided for routeEuphrates', params);
  }

  const { euphratesFactory, feeAddr } = await prepareRouteEuphrates(Mainnet.Acala);
  const tx = await euphratesFactory.deployEuphratesRouterAndRoute(
    feeAddr,
    params,
    EUPHRATES_ADDR,
    params.token,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
