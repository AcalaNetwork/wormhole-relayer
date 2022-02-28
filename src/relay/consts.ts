import {
  CHAIN_ID_KARURA,
  CHAIN_ID_ACALA,
} from '@certusone/wormhole-sdk';

export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = {
  [CHAIN_ID_KARURA]: {
    '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e': '100000000000000000',   // 0.1 WETH
    '0x2d8be6bf0baa74e0a907016679cae9190e80dd0a': '100000000000000000',   // 0.1 ERC20
  },
  [CHAIN_ID_ACALA]: {
    '0x12345': 10000,
  },
};

export const TOKEN_DECIMALS = {
  '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e': 18,
  '0x2d8be6bf0baa74e0a907016679cae9190e80dd0a': 18,
};