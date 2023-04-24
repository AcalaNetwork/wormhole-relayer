import { NextFunction, Request, Response } from 'express';
import { logger } from '../logger';
import {
  routeXcmSchema,
  routeWormholeSchema,
  relayAndRouteSchema,
} from '../validate';
import {
  relayAndRoute,
  routeWormhole,
  routeXcm,
  shouldRouteWormhole,
  shouldRouteXcm,
} from '../route';
import { NoRouteError } from './error';
import { Schema } from 'yup';

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
  },
};

const router = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await handleRoute(req, res);
  } catch (err) {
    next(err);
  }
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

export default router;
