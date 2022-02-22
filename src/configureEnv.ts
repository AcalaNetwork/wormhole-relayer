import { ChainId } from '@certusone/wormhole-sdk';
import { setDefaultWasm } from '@certusone/wormhole-sdk/lib/cjs/solana/wasm';
import dotenv from 'dotenv';

export type RelayerEnvironment = {
  supportedChains: ChainConfigInfo[];
};

export type ChainConfigInfo = {
  chainId: ChainId;
  nodeUrl: string;
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
  supportedChains.push(configSol());
  supportedChains.push(configEth());

  return { supportedChains };
}

function configKarura(): ChainConfigInfo {
  if (!process.env.KARURA_NODE_URL) {
    console.error('Missing environment variable KARURA_NODE_URL');
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
    chainId: 11 as any,    // TODO: remove any after importing new wormhole sdk
    nodeUrl: process.env.KARURA_NODE_URL,
    walletPrivateKey: process.env.KARURA_PRIVATE_KEY,
    tokenBridgeAddress: process.env.KARURA_TOKEN_BRIDGE_ADDRESS,
  };
}

function configSol(): ChainConfigInfo {
  if (!process.env.SOL_NODE_URL) {
    console.error("Missing environment variable SOL_NODE_URL");
    process.exit(1);
  }
  if (!process.env.SOL_PRIVATE_KEY) {
    console.error("Missing environment variable SOL_PRIVATE_KEY");
    process.exit(1);
  }
  if (!process.env.SOL_TOKEN_BRIDGE_ADDRESS) {
    console.error("Missing environment variable SOL_TOKEN_BRIDGE_ADDRESS");
    process.exit(1);
  }
  if (!process.env.SOL_BRIDGE_ADDRESS) {
    console.error("Missing environment variable SOL_BRIDGE_ADDRESS");
    process.exit(1);
  }

  return {
    chainId: 1,
    nodeUrl: process.env.SOL_NODE_URL,
    walletPrivateKey: process.env.SOL_PRIVATE_KEY,
    tokenBridgeAddress: process.env.SOL_TOKEN_BRIDGE_ADDRESS,
    bridgeAddress: process.env.SOL_BRIDGE_ADDRESS,
  };
}

function configEth(): ChainConfigInfo {
  if (!process.env.ETH_NODE_URL) {
    console.error("Missing environment variable ETH_NODE_URL");
    process.exit(1);
  }
  if (!process.env.ETH_PRIVATE_KEY) {
    console.error("Missing environment variable ETH_PRIVATE_KEY");
    process.exit(1);
  }
  if (!process.env.ETH_TOKEN_BRIDGE_ADDRESS) {
    console.error("Missing environment variable ETH_TOKEN_BRIDGE_ADDRESS");
    process.exit(1);
  }

  return {
    chainId: 2,
    nodeUrl: process.env.ETH_NODE_URL,
    walletPrivateKey: process.env.ETH_PRIVATE_KEY,
    tokenBridgeAddress: process.env.ETH_TOKEN_BRIDGE_ADDRESS,
  };
}
