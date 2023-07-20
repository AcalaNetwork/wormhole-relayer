import { Wallet } from 'ethers';

export const BASILISK_TESTNET_NODE_URL = 'wss://karura-testnet.aca-staging.network/rpc/basilisk/ws';

export const TEST_KEY = {
  USER: '01392cd1a09fc0f4857742f0f0daa3ebd5a0f44a7dab48c23ccd331717b97b10',
  RELAYER: 'efb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044',
};

export const TEST_ADDR_USER = new Wallet(TEST_KEY.USER).address;     // 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
export const TEST_ADDR_RELAYER = new Wallet(TEST_KEY.RELAYER).address;  // 0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3

export const KARURA_USDC_ADDRESS = '0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7';
export const GOERLI_USDC_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';
export const NOT_SUPPORTED_ADDRESS = '';
