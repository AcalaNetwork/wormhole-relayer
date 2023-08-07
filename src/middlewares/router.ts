import { NextFunction, Request, Response } from 'express';
import { Schema } from 'yup';

import { NoRouteError } from './error';
import { logger } from '../utils';
import {
  relayAndRoute,
  relayAndRouteBatch,
  routeWormhole,
  routeXcm,
  shouldRouteWormhole,
  shouldRouteXcm,
} from '../api/route';
import {
  relayAndRouteSchema,
  routeWormholeSchema,
  routeXcmSchema,
} from '../utils/validate';

interface RouterConfig {
  schema: Schema;
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
  },
};

const handleRoute = async (req: Request, res: Response) => {
  const { method, path } = req;
  const reqPath = `${method} ${path}`;
  const args = method === 'POST'
    ? req.body
    : req.query;

  logger.info({ args }, `==> ${reqPath}`);

  const config = ROUTER_CONFIGS[method]?.[path];
  if (!config) {
    throw new NoRouteError(`${reqPath} not supported`);
  }

  await config.schema.validate(args, { abortEarly: false });
  const data = await config.handler(args);

  logger.info({ data }, `<== ${reqPath}`);
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
