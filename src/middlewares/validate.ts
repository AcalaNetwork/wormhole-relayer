import { Request, Response, NextFunction } from 'express';
import { string, object, ObjectSchema } from 'yup';
import { RelayAndRouteParams, RouteParamsXcm } from '../route';

const routeParamsXcmSchema: ObjectSchema<RouteParamsXcm> = object({
  routerChainId: string().required(),
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
});

const relayAndRouteParamsSchema: ObjectSchema<RelayAndRouteParams> = object({
  routerChainId: string().required(),
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
  signedVAA: string().required(),
});

export const validateshouldRouteXcmArgs = () => {
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
