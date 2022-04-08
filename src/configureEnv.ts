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
  bridgeAddress?: string;
  walletPrivateKey: string;
};

//Polygon is not supported on local Tilt network atm.
export function validateEnvironment(): RelayerEnvironment {
  setDefaultWasm('node');
  dotenv.config({ path: '.env' });
  const supportedChains: ChainConfigInfo[] = [];
  supportedChains.push(configKarura());
  supportedChains.push(configAcala());

  return { supportedChains };
}

function configKarura(): ChainConfigInfo {
  if (!process.env.KARURA_RPC_URL_WS) {
    console.error('Missing environment variable KARURA_RPC_URL_WS');
    process.exit(1);
  }
  if (!process.env.KARURA_SUBSTRATE_NODE_URL) {
    console.error('Missing environment variable KARURA_RPC_URL_WS');
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
    nodeUrl: process.env.KARURA_RPC_URL_WS,
    substrateNodeUrl: process.env.KARURA_SUBSTRATE_NODE_URL,
    walletPrivateKey: process.env.KARURA_PRIVATE_KEY,
    tokenBridgeAddress: process.env.KARURA_TOKEN_BRIDGE_ADDRESS,
  };
}

function configAcala(): ChainConfigInfo {
  if (!process.env.ACALA_RPC_URL_WS) {
    console.error('Missing environment variable ACALA_RPC_URL_WS');
    process.exit(1);
  }
  if (!process.env.ACALA_SUBSTRATE_NODE_URL) {
    console.error('Missing environment variable ACALA_RPC_URL_WS');
    process.exit(1);
  }
  if (!process.env.ACALA_PRIVATE_KEY) {
    console.error('Missing environment variable ACALA_PRIVATE_KEY');
    process.exit(1);
  }
  if (!process.env.ACALA_TOKEN_BRIDGE_ADDRESS) {
    console.error('Missing environment variable ACALA_TOKEN_BRIDGE_ADDRESS');
    process.exit(1);
  }

  return {
    chainId: CHAIN_ID_ACALA,
    nodeUrl: process.env.ACALA_RPC_URL_WS,
    substrateNodeUrl: process.env.ACALA_SUBSTRATE_NODE_URL,
    walletPrivateKey: process.env.ACALA_PRIVATE_KEY,
    tokenBridgeAddress: process.env.ACALA_TOKEN_BRIDGE_ADDRESS,
  };
}
