import { string, object, ObjectSchema } from 'yup';
import { RelayAndRouteParams, RouteParamsWormhole, RouteParamsXcm } from './route';

export const routeParamsXcmSchema: ObjectSchema<RouteParamsXcm> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
});

export const relayAndRouteParamsSchema: ObjectSchema<RelayAndRouteParams> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
  signedVAA: string().required(),
});

export const routeParamsWormholeSchema: ObjectSchema<RouteParamsWormhole> = object({
  originAddr: string().required(),
  targetChainId: string().required(),
  destAddr: string().required(),
  fromParaId: string().required(),
});
