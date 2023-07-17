import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { CHAIN_ID_ACALA, CHAIN_ID_KARURA, ChainId } from '@certusone/wormhole-sdk';
import dotenv from 'dotenv';

import { ROUTER_CHAIN_ID } from './utils';

dotenv.config({ path: '.env' });

export type RelayerEnvironment = {
  supportedChains: ChainConfig[];
};

export type ChainConfig = {
  chainId: ROUTER_CHAIN_ID;
  ethRpc: string;
  walletPrivateKey: string;
  tokenBridgeAddr: string;
  feeAddr: string;
  factoryAddr: string;
  isTestnet: boolean;
};

const isTestnet = Boolean(Number(process.env.TESTNET_MODE ?? 1));

export function validateEnvironment(): RelayerEnvironment {
  const supportedChains: ChainConfig[] = [];
  supportedChains.push(configKarura());
  supportedChains.push(configAcala());

  return { supportedChains };
}

function configKarura(): ChainConfig {
  const requiredEnvVars = [
    'KARURA_ETH_RPC',
    'KARURA_PRIVATE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable ${envVar}`);
      process.exit(1);
    }
  }

  const addresses = isTestnet
    ? ADDRESSES.KARURA_TESTNET
    : ADDRESSES.KARURA;

  return {
    chainId: CHAIN_ID_KARURA,
    ethRpc: process.env.KARURA_ETH_RPC!,
    walletPrivateKey: process.env.KARURA_PRIVATE_KEY!,
    isTestnet,
    ...addresses,
  };
}

function configAcala(): ChainConfig {
  const requiredEnvVars = [
    'ACALA_ETH_RPC',
    'ACALA_PRIVATE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable ${envVar}`);
      process.exit(1);
    }
  }

  const addresses = isTestnet
    ? ADDRESSES.ACALA_TESTNET
    : ADDRESSES.ACALA;

  return {
    chainId: CHAIN_ID_ACALA,
    ethRpc: process.env.ACALA_ETH_RPC!,
    walletPrivateKey: process.env.ACALA_PRIVATE_KEY!,
    isTestnet,
    ...addresses,
  };
}

const env: RelayerEnvironment = validateEnvironment();

export const getChainConfig = (chainId: ChainId): ChainConfig | undefined => (
  env.supportedChains.find((x) => x.chainId === chainId)
);
