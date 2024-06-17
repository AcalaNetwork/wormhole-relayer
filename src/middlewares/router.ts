import { NextFunction, Request, Response } from 'express';
import { Schema } from 'yup';

import {
  NoRouteError,
  logger,
  relayAndRouteSchema,
  routeEuphratesSchema,
  routeHomaSchema,
  routeStatusSchema,
  routeWormholeSchema,
  routeXcmSchema,
  swapAndRouteSchema,
} from '../utils';
import {
  getAllRouteStatus,
  getRouteStatus,
  healthCheck,
  relayAndRoute,
  relayAndRouteBatch,
  routeEuphrates,
  routeHoma,
  routeHomaAuto,
  routeWormhole,
  routeXcm,
  shouldRouteEuphrates,
  shouldRouteHoma,
  shouldRouteWormhole,
  shouldRouteXcm,
} from '../api';
import { shouldSwapAndRoute, swapAndRoute } from '../api/swapAndRoute';

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
  },
};

const handleRoute = async (req: Request, res: Response) => {
  const { method, path } = req;
  const reqPath = `${method} ${path}`;
  const args = method === 'POST'
    ? req.body
    : req.query;

  logger.info({ args }, `⬇ ${reqPath}`);

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
