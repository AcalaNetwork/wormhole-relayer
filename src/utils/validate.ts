import { CHAINS, CHAIN_ID_ACALA, CHAIN_ID_KARURA, ChainId } from '@certusone/wormhole-sdk';
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

export interface ShouldRelayParams {
  targetChain: ChainId;
  originAsset: string;    // original address without padding 0s
  amount: string;
}

export interface RelayParams {
  targetChain: ChainId;
  signedVAA: string;
}

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
  timeout?: number;   // timeout minutes
}

export interface RouteParamsEuphrates {
  poolId: string;      // euphrates pool id
  recipient: string;   // dest evm address
  token?: string;      // token to route, not required for `shouldRoute`
}

// does not support general swap yet
export type SwapAndRouteParams = RouteParamsEuphrates;

// does not support general swap yet
export interface SwapAndLpParams extends RouteParamsEuphrates {
  swapAmount: string;
  minShareAmount?: string;
}

export interface RelayAndRouteParams extends RouteParamsXcm {
  signedVAA: string;
}

export interface routeStatusParams {
  id?: string;
  destAddr?: string;
}

const ALL_WORMHOLE_CHAIN_IDS = Object.values(CHAINS);
export const shouldRelaySchema: ObjectSchema<ShouldRelayParams> = object({
  targetChain: mixed<ChainId>()
    .transform((_, originalValue) => Number(originalValue))
    .oneOf(ALL_WORMHOLE_CHAIN_IDS, 'targetChain is not a valid wormhole chain id')
    .required(),
  originAsset: string().required(),
  amount: string().required(),
});

export const relaySchema: ObjectSchema<RelayParams> = object({
  targetChain: mixed<ChainId>().oneOf(ALL_WORMHOLE_CHAIN_IDS).required(),
  signedVAA: string().required(),
});

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
  timeout: number()
    .min(3, 'timeout must be at least 3 minutes')
    .max(30, 'timeout cannot exceed 30 minutes'),
});

export const routeEuphratesSchema: ObjectSchema<RouteParamsEuphrates> = object({
  poolId: string().required(),
  recipient: string().required(),
  token: string(),
});

export const swapAndRouteSchema = routeEuphratesSchema;

export const swapAndLpSchema: ObjectSchema<SwapAndLpParams> = object({
  poolId: string().required(),
  recipient: string().required(),
  swapAmount: string().required(),
  token: string(),
  minShareAmount: string(),
});

export const routeStatusSchema: ObjectSchema<routeStatusParams> = object({
  id: string(),
  destAddr: string(),
}).test(
  'id-or-destAddr',
  'either `id` or `destAddr` is required',
  value =>
    (!!value.id && !value.destAddr) ||
    (!value.id && !!value.destAddr)
);
