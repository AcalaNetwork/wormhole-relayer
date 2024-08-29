import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise } from '@polkadot/api';
import { CHAIN_ID_ACALA, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { Wallet } from 'ethers';
import { bool, cleanEnv, str } from 'envalid';
import dotenv from 'dotenv';

import { RouterChainId, getApi } from './utils';

export type ChainConfig = {
  chainId: RouterChainId;
  provider: AcalaJsonRpcProvider;
  wallet: Wallet;
  api: ApiPromise;
  relayerSubstrateAddr: string;
  tokenBridgeAddr: string;
  feeAddr: string;
  factoryAddr: string;
  homaFactoryAddr?: string;
  accountHelperAddr?: string;
  euphratesFactoryAddr?: string;
  swapAndStakeFactoryAddr?: string;
  dropAndSwapStakeFactoryAddr?: string;
  isTestnet: boolean;
};

export type RelayerEnvironment = ChainConfig[];

dotenv.config();

const env = cleanEnv(process.env, {
  KARURA_ETH_RPC: str(),
  KARURA_PRIVATE_KEY: str(),
  KARURA_NODE_URL: str(),
  ACALA_ETH_RPC: str(),
  ACALA_PRIVATE_KEY: str(),
  ACALA_NODE_URL: str(),
  TESTNET_MODE: bool(),
});

const isTestnet = env.TESTNET_MODE;

export const prepareEnvironment = (): Promise<RelayerEnvironment> => Promise.all([
  configKarura(),
  configAcala(),
]);

const configKarura = async (): Promise<ChainConfig> => {
  const addresses = isTestnet
    ? ADDRESSES.KARURA_TESTNET
    : ADDRESSES.KARURA;

  const provider = new AcalaJsonRpcProvider(env.KARURA_ETH_RPC);
  const wallet = new Wallet(env.KARURA_PRIVATE_KEY, provider);
  const { substrateAddr, api } = await getApi(
    env.KARURA_PRIVATE_KEY,
    env.KARURA_NODE_URL,
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
  const addresses = isTestnet
    ? ADDRESSES.ACALA_TESTNET
    : ADDRESSES.ACALA;

  const provider = new AcalaJsonRpcProvider(env.ACALA_ETH_RPC);
  const wallet = new Wallet(env.ACALA_PRIVATE_KEY, provider);
  const { substrateAddr, api } = await getApi(
    env.ACALA_PRIVATE_KEY,
    env.ACALA_NODE_URL,
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

const configs = prepareEnvironment();
export const getChainConfig = async (chainId: RouterChainId): Promise<ChainConfig> => (
  (await configs).find(x => x.chainId === chainId)!
);
