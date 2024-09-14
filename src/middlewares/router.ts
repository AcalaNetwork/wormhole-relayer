import { NextFunction, Request, Response } from 'express';
import { Schema } from 'yup';

import {
  NoRouteError,
  logger,
  parseIp,
  relayAndRouteSchema,
  relaySchema,
  routeEuphratesSchema,
  routeHomaSchema,
  routeStatusSchema,
  routeWormholeSchema,
  routeXcmSchema,
  routerInfoQuerySchema,
  routerInfoUpdateSchema,
  shouldRelaySchema,
  swapAndLpSchema,
  swapAndRouteSchema,
} from '../utils';
import {
  getAllRouteStatus,
  getRouteStatus,
  getRouterInfo,
  healthCheck,
  relay,
  relayAndRoute,
  relayAndRouteBatch,
  rescueSwapAndLp,
  routeEuphrates,
  routeHoma,
  routeHomaAuto,
  routeSwapAndLp,
  routeWormhole,
  routeXcm,
  saveRouterInfo,
  shouldRelay,
  shouldRouteEuphrates,
  shouldRouteHoma,
  shouldRouteSwapAndLp,
  shouldRouteWormhole,
  shouldRouteXcm,
  shouldSwapAndRoute,
  swapAndRoute,
} from '../api';

interface RouterConfig {
  schema?: Schema;
  handler: (data: any) => Promise<any>;
}

const ROUTER_CONFIGS: {
  [method: string]: {
    [path: string]: RouterConfig;
  };
} = {
  GET: {
    '/shouldRelay': {
      schema: shouldRelaySchema,
      handler: shouldRelay,
    },
    '/shouldRouteWormhole': {
      schema: routeWormholeSchema,
      handler: shouldRouteWormhole,
    },
    '/shouldRouteXcm': {
      schema: routeXcmSchema,
      handler: shouldRouteXcm,
    },
    '/shouldRouteHoma': {
      schema: routeHomaSchema,
      handler: shouldRouteHoma,
    },
    '/shouldRouteEuphrates': {
      schema: routeEuphratesSchema,
      handler: shouldRouteEuphrates,
    },
    '/shouldSwapAndRoute': {
      schema: swapAndRouteSchema,
      handler: shouldSwapAndRoute,
    },
    '/shouldRouteSwapAndLp': {
      schema: swapAndLpSchema,
      handler: shouldRouteSwapAndLp,
    },
    '/health': {
      handler: healthCheck,
    },
    '/routeStatus': {
      schema: routeStatusSchema,
      handler: getRouteStatus,
    },
    '/allRouteStatus': {
      handler: getAllRouteStatus,
    },
    '/routerInfo': {
      schema: routerInfoQuerySchema,
      handler: getRouterInfo,
    },
  },

  POST: {
    '/relay': {
      schema: relaySchema,
      handler: relay,
    },
    '/routeWormhole': {
      schema: routeWormholeSchema,
      handler: routeWormhole,
    },
    '/routeXcm': {
      schema: routeXcmSchema,
      handler: routeXcm,
    },
    '/relayAndRoute': {
      schema: relayAndRouteSchema,
      handler: relayAndRoute,
    },
    '/relayAndRouteBatch': {
      schema: relayAndRouteSchema,
      handler: relayAndRouteBatch,
    },
    '/routeHoma': {
      schema: routeHomaSchema,
      handler: routeHoma,
    },
    '/routeHomaAuto': {
      schema: routeHomaSchema,
      handler: routeHomaAuto,
    },
    '/routeEuphrates': {
      schema: routeEuphratesSchema,
      handler: routeEuphrates,
    },
    '/swapAndRoute': {
      schema: swapAndRouteSchema,
      handler: swapAndRoute,
    },
    '/routeSwapAndLp': {
      schema: swapAndLpSchema,
      handler: routeSwapAndLp,
    },
    '/rescueSwapAndLp': {
      schema: swapAndLpSchema,
      handler: rescueSwapAndLp,
    },
    '/saveRouterInfo': {
      schema: routerInfoUpdateSchema,
      handler: saveRouterInfo,
    },
  },
};

const handleRoute = async (req: Request, res: Response) => {
  const { method, path } = req;
  const reqPath = `${method} ${path}`;
  const args = method === 'POST'
    ? req.body
    : req.query;

  const ip = parseIp(req);
  logger.info({ args, ip }, `⬇ ${reqPath}`);

  const config = ROUTER_CONFIGS[method]?.[path];
  if (!config) {
    throw new NoRouteError(`${reqPath} not supported`);
  }

  await config.schema?.validate(args, { abortEarly: false });
  const data = await config.handler(args);

  logger.info({ data }, `✨ ${reqPath}`);
  res.end(JSON.stringify({ data }));
};

export const router = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handleRoute(req, res);
  } catch (err) {
    logger.error(err);
    next(err);
  }
};
