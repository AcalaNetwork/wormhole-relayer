import { ObjectSchema, object, string } from 'yup';

interface RouteParamsBase {
  originAddr: string;     // origin token address
}

export interface RouteParamsWormhole extends RouteParamsBase {
  targetChainId: string;
  destAddr: string;       // recepient address in hex
  fromParaId: string;     // from parachain id in number
}

export interface RouteParamsXcm extends RouteParamsBase {
  destParaId: string;  // TODO: maybe can decode from dest
  dest: string;           // xcm encoded dest in hex
}

export interface RelayAndRouteParams extends RouteParamsXcm {
  signedVAA: string;
}

export const routeXcmSchema: ObjectSchema<RouteParamsXcm> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
});

export const relayAndRouteSchema: ObjectSchema<RelayAndRouteParams> = object({
  originAddr: string().required(),
  destParaId: string().required(),
  dest: string().required(),
  signedVAA: string().required(),
});

export const routeWormholeSchema: ObjectSchema<RouteParamsWormhole> = object({
  originAddr: string().required(),
  targetChainId: string().required(),
  destAddr: string().required(),
  fromParaId: string().required(),
});
