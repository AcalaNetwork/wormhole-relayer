import { NextFunction, Request, Response } from 'express';
import { Schema } from 'yup';

import {
  NoRouteError,
  dropAndBootstrapSchema,
  logger,
  parseIp,
  relayAndRouteSchema,
  relaySchema,
  routeEuphratesSchema,
  routeHomaSchema,
  routeStatusSchema,
  routeWormholeSchema,
  routeXcmSchema,
  shouldRelaySchema,
  swapAndRouteSchema,
} from '../utils';
import {
  getAllRouteStatus,
  getRouteStatus,
  healthCheck,
  relay,
  relayAndRoute,
  relayAndRouteBatch,
  routeEuphrates,
  routeHoma,
  routeHomaAuto,
  routeWormhole,
  routeXcm,
  shouldRelay,
  shouldRouteEuphrates,
  shouldRouteHoma,
  shouldRouteWormhole,
  shouldRouteXcm,
  shouldSwapAndRoute,
  swapAndRoute,
} from '../api';
import { rescueDropAndBoostrap, routeDropAndBoostrap, shouldRouteDropAndBoostrap } from '../api/dropAndBootstrap';

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
    '/shouldRouteDropAndBootstrap': {
      schema: dropAndBootstrapSchema,
      handler: shouldRouteDropAndBoostrap,
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
    '/routeDropAndBootstrap': {
      schema: dropAndBootstrapSchema,
      handler: routeDropAndBoostrap,
    },
    '/rescueDropAndBootstrap': {
      schema: dropAndBootstrapSchema,
      handler: rescueDropAndBoostrap,
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

  const validatedArgs = await config.schema?.validate(args, { abortEarly: false });
  const data = await config.handler(validatedArgs);

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
