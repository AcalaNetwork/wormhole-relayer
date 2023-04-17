import { Request, Response, NextFunction } from 'express';
import { string, object, ObjectSchema } from 'yup';
import { RelayAndRouteParams, RouteParamsWormhole, RouteParamsXcm } from '../route';

const routeParamsXcmSchema: ObjectSchema<RouteParamsXcm> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
});

const relayAndRouteParamsSchema: ObjectSchema<RelayAndRouteParams> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
  signedVAA: string().required(),
});

const RouteParamsWormholeSchema: ObjectSchema<RouteParamsWormhole> = object({
  originAddr: string().required(),
  targetChainId: string().required(),
  destAddr: string().required(),
  fromParaId: string().required(),
});

// TODO: combine similar ones
export const validateShouldRouteXcmArgs = () => {
  return async (req: Request<any, any, any, RouteParamsXcm>, res: Response, next: NextFunction) => {
    try {
      await routeParamsXcmSchema.validate(req.query, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({
        msg: err.errors,
        shouldRoute: false,
      });
    }
  };
};

export const validateRouteXcmArgs = () => {
  return async (req: Request<any, any, RouteParamsXcm, any>, res: Response, next: NextFunction) => {
    try {
      await routeParamsXcmSchema.validate(req.body, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({ errors: err.errors });
    }
  };
};

export const validateRelayAndRouteArgs = () => {
  return async (req: Request<any, any, RelayAndRouteParams, any>, res: Response, next: NextFunction) => {
    try {
      await relayAndRouteParamsSchema.validate(req.body, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({ errors: err.errors });
    }
  };
};

export const validateShouldRouteWormholeArgs = () => {
  return async (req: Request<any, any, any, RouteParamsWormhole>, res: Response, next: NextFunction) => {
    try {
      await RouteParamsWormholeSchema.validate(req.query, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({
        msg: err.errors,
        shouldRoute: false,
      });
    }
  };
};

export const validateRouteWormholeArgs = () => {
  return async (req: Request<any, any, RouteParamsWormhole, any>, res: Response, next: NextFunction) => {
    try {
      await RouteParamsWormholeSchema.validate(req.body, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({
        msg: err.errors,
        shouldRoute: false,
      });
    }
  };
};
