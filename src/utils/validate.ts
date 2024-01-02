import { CHAIN_ID_ACALA, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { ObjectSchema, mixed, number, object, string } from 'yup';

export enum Mainnet {
  Acala = 'acala',
  Karura = 'karura',
}

export const getMainnetChainId = (mainnet: Mainnet) => (
  mainnet === Mainnet.Acala
    ? CHAIN_ID_ACALA
    : CHAIN_ID_KARURA
);

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

export interface RouteParamsHoma {
  chain: Mainnet;
  destAddr: string;   // dest evm or acala native address
}

export interface RouteParamsEuphrates {
  poolId: number;      // euphrates pool id
  recipient: string;   // dest evm address
  token?: string;      // token to route, not required for `shouldRoute`
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

export const routeHomaSchema: ObjectSchema<RouteParamsHoma> = object({
  destAddr: string().required(),
  chain: mixed<Mainnet>().oneOf(Object.values(Mainnet)).required(),
});

export const routeEuphratesSchema: ObjectSchema<RouteParamsEuphrates> = object({
  poolId: number().required(),
  recipient: string().required(),
  token: string(),
});
