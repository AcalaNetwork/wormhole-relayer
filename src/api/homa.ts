import { DOT } from '@acala-network/contracts/utils/AcalaTokens';
import { HomaFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { KSM } from '@acala-network/contracts/utils/KaruraTokens';

import {
  Mainnet,
  RouteParamsHoma,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
  toAddr32,
} from '../utils';

const prepareRouteHoma = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, homaFactoryAddr, wallet } = chainConfig;

  const homaFactory = HomaFactory__factory.connect(homaFactoryAddr!, wallet);
  const routeToken = chain === Mainnet.Acala ? DOT : KSM;

  return { homaFactory, feeAddr, routeToken };
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
  const { homaFactory, feeAddr, routeToken } = await prepareRouteHoma(chain);
  const tx = await homaFactory.deployHomaRouterAndRoute(feeAddr, toAddr32(destAddr), routeToken);
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
