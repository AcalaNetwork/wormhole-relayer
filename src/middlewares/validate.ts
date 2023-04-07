import { Request, Response, NextFunction } from 'express';
import { string, object, ObjectSchema, ValidationError } from 'yup';
import { RouteArgsXcm } from '../route';

const routeArgsXcmSchema: ObjectSchema<RouteArgsXcm> = object({
  routerChainId: string().required(),
  originAddr: string().required(),
  targetChain: string().required(),
  dest: string().required(),
});

export const validateshouldRouteXcmArgs = () => {
  return async (req: Request<any, any, any, RouteArgsXcm>, res: Response, next: NextFunction) => {
    try {
      await routeArgsXcmSchema.validate(req.query, { abortEarly: false });
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
  return async (req: Request<any, any, RouteArgsXcm, any>, res: Response, next: NextFunction) => {
    try {
      await routeArgsXcmSchema.validate(req.body, { abortEarly: false });
      next();
    } catch (err) {
      return res.status(200).json({
        msg: err.errors,
        shouldRoute: false,
      });
    }
  };
};
