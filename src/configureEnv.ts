import { ChainId, CHAIN_ID_KARURA, CHAIN_ID_ACALA } from '@certusone/wormhole-sdk';
import { setDefaultWasm } from '@certusone/wormhole-sdk/lib/cjs/solana/wasm';
import dotenv from 'dotenv';

export type RelayerEnvironment = {
  supportedChains: ChainConfigInfo[];
};

export type ChainConfigInfo = {
  chainId: ChainId;
  nodeUrl: string;
  substrateNodeUrl: string,
  tokenBridgeAddress: string;
  walletPrivateKey: string;
};

export function validateEnvironment(): RelayerEnvironment {
  setDefaultWasm('node');
  dotenv.config({ path: '.env' });
  const supportedChains: ChainConfigInfo[] = [];
  supportedChains.push(configKarura());
  supportedChains.push(configAcala());

  return { supportedChains };
}

function configKarura(): ChainConfigInfo {
  if (!process.env.KARURA_ETH_RPC_URL) {
    console.error('Missing environment variable KARURA_ETH_RPC_URL');
    process.exit(1);
  }
  if (!process.env.KARURA_SUBSTRATE_NODE_URL) {
    console.error('Missing environment variable KARURA_SUBSTRATE_NODE_URL');
    process.exit(1);
  }
  if (!process.env.KARURA_PRIVATE_KEY) {
    console.error('Missing environment variable KARURA_PRIVATE_KEY');
    process.exit(1);
  }
  if (!process.env.KARURA_TOKEN_BRIDGE_ADDRESS) {
    console.error('Missing environment variable KARURA_TOKEN_BRIDGE_ADDRESS');
    process.exit(1);
  }

  return {
    chainId: CHAIN_ID_KARURA,
    nodeUrl: process.env.KARURA_ETH_RPC_URL,
    substrateNodeUrl: process.env.KARURA_SUBSTRATE_NODE_URL,
    walletPrivateKey: process.env.KARURA_PRIVATE_KEY,
    tokenBridgeAddress: process.env.KARURA_TOKEN_BRIDGE_ADDRESS,
  };
}

function configAcala(): ChainConfigInfo {
  if (!process.env.ACALA_ETH_RPC_URL) {
    console.warn('Missing environment variable ACALA_ETH_RPC_URL');
  }
  if (!process.env.ACALA_SUBSTRATE_NODE_URL) {
    console.warn('Missing environment variable ACALA_SUBSTRATE_NODE_URL');
  }
  if (!process.env.ACALA_PRIVATE_KEY) {
    console.warn('Missing environment variable ACALA_PRIVATE_KEY');
  }
  if (!process.env.ACALA_TOKEN_BRIDGE_ADDRESS) {
    console.warn('Missing environment variable ACALA_TOKEN_BRIDGE_ADDRESS');
  }

  return {
    chainId: CHAIN_ID_ACALA,
    nodeUrl: process.env.ACALA_ETH_RPC_URL || '',
    substrateNodeUrl: process.env.ACALA_SUBSTRATE_NODE_URL || '',
    walletPrivateKey: process.env.ACALA_PRIVATE_KEY || '',
    tokenBridgeAddress: process.env.ACALA_TOKEN_BRIDGE_ADDRESS || '',
  };
}
