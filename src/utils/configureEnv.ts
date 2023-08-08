import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise } from '@polkadot/api';
import { CHAIN_ID_ACALA, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { Wallet } from 'ethers';
import dotenv from 'dotenv';

import { ROUTER_CHAIN_ID, getApi } from './utils';

dotenv.config({ path: '.env' });

export type ChainConfig = {
  chainId: ROUTER_CHAIN_ID;
  provider: AcalaJsonRpcProvider;
  wallet: Wallet;
  api: ApiPromise;
  relayerSubstrateAddr: string;
  tokenBridgeAddr: string;
  feeAddr: string;
  factoryAddr: string;
  isTestnet: boolean;
};

export type RelayerEnvironment = ChainConfig[];

const ensureEnvVars = (envVars: string[]) => {
  for (const envVar of envVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable ${envVar}`);
      process.exit(1);
    }
  }
};

const isTestnet = Boolean(Number(process.env.TESTNET_MODE ?? 1));

export const prepareEnvironment = (): Promise<RelayerEnvironment> => Promise.all([
  configKarura(),
  configAcala(),
]);

const configKarura = async (): Promise<ChainConfig> => {
  ensureEnvVars([
    'KARURA_ETH_RPC',
    'KARURA_PRIVATE_KEY',
    'KARURA_NODE_URL',
  ]);

  const addresses = isTestnet
    ? ADDRESSES.KARURA_TESTNET
    : ADDRESSES.KARURA;

  const provider = new AcalaJsonRpcProvider(process.env.KARURA_ETH_RPC!);
  const wallet = new Wallet(process.env.KARURA_PRIVATE_KEY!, provider);
  const { substrateAddr, api } = await getApi(
    process.env.KARURA_PRIVATE_KEY!,
    process.env.KARURA_NODE_URL!,
  );

  return {
    chainId: CHAIN_ID_KARURA,
    provider,
    wallet,
    api,
    relayerSubstrateAddr: substrateAddr,
    isTestnet,
    ...addresses,
  };
};

const configAcala = async (): Promise<ChainConfig> => {
  ensureEnvVars([
    'ACALA_ETH_RPC',
    'ACALA_PRIVATE_KEY',
    'ACALA_NODE_URL',
  ]);

  const addresses = isTestnet
    ? ADDRESSES.ACALA_TESTNET
    : ADDRESSES.ACALA;

  const provider = new AcalaJsonRpcProvider(process.env.ACALA_ETH_RPC!);
  const wallet = new Wallet(process.env.ACALA_PRIVATE_KEY!, provider);
  const { substrateAddr, api } = await getApi(
    process.env.ACALA_PRIVATE_KEY!,
    process.env.ACALA_NODE_URL!,
  );

  return {
    chainId: CHAIN_ID_ACALA,
    provider,
    wallet,
    api,
    relayerSubstrateAddr: substrateAddr,
    isTestnet,
    ...addresses,
  };
};

const env = prepareEnvironment();
export const getChainConfig = async (chainId: ROUTER_CHAIN_ID): Promise<ChainConfig> => (
  (await env).find((x) => x.chainId === chainId)!
);
