import { Wallet } from 'ethers';

export const TEST_KEY = {
  USER: '01392cd1a09fc0f4857742f0f0daa3ebd5a0f44a7dab48c23ccd331717b97b10',
  RELAYER: 'efb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044',
};

export const TEST_ADDR_USER = new Wallet(TEST_KEY.USER).address;     // 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
export const TEST_ADDR_RELAYER = new Wallet(TEST_KEY.RELAYER).address;  // 0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3

export const NOT_SUPPORTED_ADDRESS = '';
