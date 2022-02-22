// TODO: import from wormhole sdk after it published
const CHAIN_ID_KARURA = 11;
const CHAIN_ID_ACALA = 12;

// TODO: repace with real value after we know the addresses
// or async fetch it, like tokenMarkets
export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = {
  [CHAIN_ID_KARURA]: {
    '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e': '10000000000000000000',   // 10 WETH
  },
  [CHAIN_ID_ACALA]: {
    '0x12345': 10000,
  },
};

export const TOKEN_DECIMALS = {
  '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e': 18,
};