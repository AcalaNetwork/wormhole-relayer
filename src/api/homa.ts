import { ContractTransaction } from 'ethers';
import { DOT } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory, HomaFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { KSM } from '@acala-network/contracts/utils/KaruraTokens';

import {
  Mainnet,
  RouteError,
  RouteParamsHoma,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
  routeStatusParams,
  runWithRetry,
  toAddr32,
} from '../utils';

const prepareRouteHoma = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, homaFactoryAddr, wallet } = chainConfig;

  const homaFactory = HomaFactory__factory.connect(homaFactoryAddr!, wallet);
  const routeToken = chain === Mainnet.Acala ? DOT : KSM;

  return { homaFactory, feeAddr, routeToken, wallet };
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

/* --------------------------------- auto route homa --------------------------------- */
export enum RouteStatus {
  Waiting = 0,
  Routing = 1,
  Confirming = 2,
  Complete = 3,
  Timeout = -1,
  Failed = -2,
};

interface RouteInfo {
  status: RouteStatus;
  txHash?: string;
  err?: any;
}

let routeReqId = Date.now();
const routeTracker: Record<number, RouteInfo> = {};
export const routeHomaAuto = async (params: RouteParamsHoma) =>  {
  const { chain, destAddr } = params;
  const { routerAddr, shouldRoute, msg } = await shouldRouteHoma(params);

  if (!shouldRoute) {
    throw new RouteError(msg, params);
  }

  const reqId = `homa-${routeReqId++}`;
  const tracker = routeTracker[reqId] = { status: RouteStatus.Waiting } as RouteInfo;

  const { homaFactory, feeAddr, routeToken, wallet } = await prepareRouteHoma(chain);
  const dotOrKsm = ERC20__factory.connect(routeToken, wallet);

  const waitForToken = new Promise<void>((resolve, reject) => {
    const id = setInterval(async () => {
      const bal = await runWithRetry(() => dotOrKsm.balanceOf(routerAddr!));
      if (bal.gt(0)) {
        clearInterval(id);
        resolve();
      }
    }, 3000);

    const timeout = 3 * 60 * 1000;    // 3 min
    setTimeout(() => {
      clearInterval(id);
      reject('timeout');
    }, timeout);
  });

  waitForToken.then(async () => {
    tracker.status = RouteStatus.Routing;

    let tx: ContractTransaction;
    try {
      tx = await runWithRetry(
        () => homaFactory.deployHomaRouterAndRoute(feeAddr, toAddr32(destAddr), routeToken),
        { retry: 3, interval: 20 }
      );
    } catch (err) {
      tracker.status = RouteStatus.Failed;
      tracker.err = err.message;
      return;
    }

    tracker.txHash = tx.hash;
    tracker.status = RouteStatus.Confirming;

    const receipt = await runWithRetry(() => tx.wait(), { retry: 3, interval: 10 });
    tracker.status = receipt.status === 0
      ? RouteStatus.Failed
      : RouteStatus.Complete;
  }).catch(err => {
    if (err === 'timeout') {
      tracker.status = RouteStatus.Timeout;
    } else {
      tracker.status = RouteStatus.Failed;
      tracker.err = err;
    }
  });

  // clear record after 7 days to avoid memory blow
  setTimeout(() => delete routeTracker[reqId], 7 * 24 * 60 * 60 * 1000);

  return reqId;
};

export const getRouteStatus = async ({ id }: routeStatusParams) => routeTracker[id];
export const getAllRouteStatus = async () => routeTracker;
