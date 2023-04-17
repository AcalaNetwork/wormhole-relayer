import { ChainId, CHAIN_ID_KARURA, CHAIN_ID_ACALA } from '@certusone/wormhole-sdk';
import dotenv from 'dotenv';
import { ADDRESSES } from './consts';

export type RelayerEnvironment = {
  supportedChains: ChainConfigInfo[];
};

export type ChainConfigInfo = {
  chainId: ChainId;
  ethRpc: string;
  nodeUrl: string;
  walletPrivateKey: string;
  tokenBridgeAddr: string;
  feeAddr: string;
  factoryAddr: string;
  xtokensAddr: string;
};

const isTestnet = Number(process.env.TESTNET_MODE ?? 1);

export function validateEnvironment(): RelayerEnvironment {
  dotenv.config({ path: '.env' });
  const supportedChains: ChainConfigInfo[] = [];
  supportedChains.push(configKarura());
  supportedChains.push(configAcala());

  return { supportedChains };
}

function configKarura(): ChainConfigInfo {
  const requiredEnvVars = [
    'KARURA_ETH_RPC',
    'KARURA_NODE_URL',
    'KARURA_PRIVATE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable ${envVar}`);
      process.exit(1);
    }
  }

  const addresses = isTestnet
    ? ADDRESSES.karuraTestnet
    : ADDRESSES.karura;

  return {
    chainId: CHAIN_ID_KARURA,
    ethRpc: process.env.KARURA_ETH_RPC!,
    nodeUrl: process.env.KARURA_NODE_URL!,
    walletPrivateKey: process.env.KARURA_PRIVATE_KEY!,
    ...addresses,
  };
}

function configAcala(): ChainConfigInfo {
  const requiredEnvVars = [
    'ACALA_ETH_RPC',
    'ACALA_NODE_URL',
    'ACALA_PRIVATE_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing environment variable ${envVar}`);
      process.exit(1);
    }
  }

  const addresses = isTestnet
    ? ADDRESSES.acalaTestnet
    : ADDRESSES.acala;

  return {
    chainId: CHAIN_ID_ACALA,
    ethRpc: process.env.ACALA_ETH_RPC!,
    nodeUrl: process.env.ACALA_NODE_URL!,
    walletPrivateKey: process.env.ACALA_PRIVATE_KEY!,
    ...addresses,
  };
}

const env: RelayerEnvironment = validateEnvironment();

export const getChainConfigInfo = (chainId: ChainId): ChainConfigInfo | undefined => (
  env.supportedChains.find((x) => x.chainId === chainId)
);
