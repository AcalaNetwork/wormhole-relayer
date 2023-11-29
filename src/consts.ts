import {
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const isTestnet = Number(process.env.TESTNET_MODE ?? 1);

export const enum ETH_RPC {
  LOCAL = 'http://localhost:8545',

  BSC = 'https://endpoints.omniatech.io/v1/bsc/mainnet/public',
  KARURA = 'https://eth-rpc-karura.aca-api.network',
  ACALA = 'https://eth-rpc-acala.aca-api.network',

  BSC_TESTNET = 'https://endpoints.omniatech.io/v1/bsc/testnet/public',
  FUJI = 'https://avalanche-fuji-c-chain.publicnode.com',
  GOERLI = 'https://rpc.ankr.com/eth_goerli',
  KARURA_TESTNET = 'https://eth-rpc-karura-testnet.aca-staging.network',
};

export const enum BSC_TOKEN {
  USDC = '0xB04906e95AB5D797aDA81508115611fee694c2b3',
  DAI = '0x3413a030EF81a3dD5a302F4B4D11d911e12ed337',
  USDT = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
};

export const enum FUJI_TOKEN {
  USDC = '0x63A30f239DC8d1c17Bf6653a68Fc6C2F83641E6d',
};

export const WORMHOLE_GUARDIAN_RPC = {
  TESTNET: ['https://wormhole-v2-testnet-api.certus.one'],
  MAINNET: ['https://wormhole-v2-mainnet-api.certus.one'],
};

const RELAYER_BASE_URL = 'http://localhost:3111';
// const RELAYER_BASE_URL = 'https://relayer.aca-dev.network';
// const RELAYER_BASE_URL = 'https://relayer.aca-api.network';

export const RELAYER_API = {
  SHOULD_RELAY: '/shouldRelay',
  RELAY: '/relay',

  SHOULD_ROUTE_XCM: '/shouldRouteXcm',
  ROUTE_XCM: '/routeXcm',

  SHOULD_ROUTE_WORMHOLE: '/shouldRouteWormhole',
  ROUTE_WORMHOLE: '/routeWormhole',
  RELAY_AND_ROUTE: '/relayAndRoute',
  RELAY_AND_ROUTE_BATCH: '/relayAndRouteBatch',

  GET_HOMA_ROUTER_ADDR: '/shouldRouteHoma',
  ROUTE_HOMA: '/routeHoma',

  NO_ROUTE: '/noRoute',
  VERSION: '/version',
  TEST_TIMEOUT: '/testTimeout',
  HEALTH: '/health',
} as const;

export const RELAYER_URL = {
  SHOULD_RELAY: `${RELAYER_BASE_URL}${RELAYER_API.SHOULD_RELAY}`,
  RELAY: `${RELAYER_BASE_URL}${RELAYER_API.RELAY}`,

  SHOULD_ROUTE_XCM: `${RELAYER_BASE_URL}${RELAYER_API.SHOULD_ROUTE_XCM}`,
  ROUTE_XCM: `${RELAYER_BASE_URL}${RELAYER_API.ROUTE_XCM}`,

  SHOULD_ROUTE_WORMHOLE: `${RELAYER_BASE_URL}${RELAYER_API.SHOULD_ROUTE_WORMHOLE}`,
  ROUTE_WORMHOLE: `${RELAYER_BASE_URL}${RELAYER_API.ROUTE_WORMHOLE}`,
  RELAY_AND_ROUTE: `${RELAYER_BASE_URL}${RELAYER_API.RELAY_AND_ROUTE}`,
  RELAY_AND_ROUTE_BATCH: `${RELAYER_BASE_URL}${RELAYER_API.RELAY_AND_ROUTE_BATCH}`,

  GET_HOMA_ROUTER_ADDR: `${RELAYER_BASE_URL}${RELAYER_API.GET_HOMA_ROUTER_ADDR}`,
  ROUTE_HOMA: `${RELAYER_BASE_URL}${RELAYER_API.ROUTE_HOMA}`,

  NO_ROUTE: `${RELAYER_BASE_URL}${RELAYER_API.NO_ROUTE}`,
  VERSION: `${RELAYER_BASE_URL}${RELAYER_API.VERSION}`,
  TEST_TIMEOUT: `${RELAYER_BASE_URL}${RELAYER_API.TEST_TIMEOUT}`,
  HEALTH: `${RELAYER_BASE_URL}${RELAYER_API.HEALTH}`,
} as const;

/* ---------------
   thredhold amount is defined as "amount that will show on VAA"
   address should be **lower case** address to be consistent
                                                --------------- */
const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_DEV = {
  [CHAIN_ID_KARURA]: {
    // 0.1 BSC USDT => karura WUSDT 0x478dEFc2Fc2be13a505dafBDF1e5400847E2efF6
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd': '10000000',

    // 0.02 BSC ETH => karura WETH ?
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378': '2000000',

    // 0.001 Goerli USDC => karura WUSDC 0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7
    '0x07865c6e87b9f70255377e024ace6630c1eaa37f': '1000',
  },
  [CHAIN_ID_ACALA]: {
    // 0.1 BSC USDT => Acala WUSDT 0xb54bA7F042DCAFba0A546e69F69E81b4F59B9C92
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd': '10000000',

    // 0.02 BSC ETH => karura WETH ?
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378': '2000000',

    // 0.01 Goerli USDC => karura WUSDC 0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7
    '0x07865c6e87b9f70255377e024ace6630c1eaa37f': '10000',
  },
};

const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_PROD = {
  [CHAIN_ID_KARURA]: {
    // 10 ETH mainnet USDC => karura WUSDC 0x1F3a10587A20114EA25Ba1b388EE2dD4A337ce27
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '10000000',     // 1 USDC = 10{6}

    // 10 ETH mainnet DAI  => karura WDAI 0x4bB6afB5Fa2b07a5D1c499E1c3DDb5A15e709a71
    '0x6b175474e89094c44da98b954eedeac495271d0f': '1000000000',   // 1 DAI = 10{8}

    // 1 Acala AUSD        => karura WAUSD 0xE20683ad1ED8bbeED7E1aE74Be10F19D8045B530
    '0x0000000000000000000100000000000000000001': '100000000',    // 1 AUSD = 10{8}
  },
  [CHAIN_ID_ACALA]: {
    // 10 ETH mainnet USDC => karura WUSDC 0x07DF96D1341A7d16Ba1AD431E2c847d978BC2bCe
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '10000000',     // 1 USDC = 10{6}

    // 10 ETH mainnet DAI  => karura WDAI 0x54A37A01cD75B616D63E0ab665bFfdb0143c52AE
    '0x6b175474e89094c44da98b954eedeac495271d0f': '1000000000',   // 1 DAI = 10{8}

    // 1 karura WAUSD      => Acala AUSD 0x0000000000000000000100000000000000000001
    '0x0000000000000000000100000000000000000001': '100000000',   // 1 WAUSD = 10{8}
  },
};

export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = isTestnet
  ? RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_DEV
  : RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_PROD;

export const enum PARA_ID {
  BASILISK = '2090',
  CALAMARI = '2084',
  SHADOW = '2012',

  HYDRA = '2034',
  MANTA = '2104',
  CRUST =  '2008',
}

export const GOERLI_USDC = '0x07865c6e87b9f70255377e024ace6630c1eaa37f';
export const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

const ROUTE_SUPPORTED_CHAINS_AND_ASSETS_DEV = {
  //   [HYDRA_PARA_ID]: [
  //     GOERLI_USDC,
  //   ],
  [PARA_ID.BASILISK]: [
    GOERLI_USDC,
  ],
} as const;

const ASSETS_COMMON_HYDRA = [
  ROUTER_TOKEN_INFO.weth.originAddr,
  ROUTER_TOKEN_INFO.wbtc.originAddr,
] as const;

const ASSETS_COMMON_MANTA = [
  ROUTER_TOKEN_INFO.arb.originAddr,
  ROUTER_TOKEN_INFO.ldo.originAddr,
  ROUTER_TOKEN_INFO.shib.originAddr,
  ROUTER_TOKEN_INFO.wmatic.originAddr,
  ROUTER_TOKEN_INFO.wbnb.originAddr,
  ROUTER_TOKEN_INFO.uni.originAddr,
  ROUTER_TOKEN_INFO.busd.originAddr,
  ROUTER_TOKEN_INFO.link.originAddr,
  ROUTER_TOKEN_INFO.ape.originAddr,
] as const;

export const ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD = {
  /* --------------- karura --------------- */
  [PARA_ID.BASILISK]: [
    ...ASSETS_COMMON_HYDRA,
    ROUTER_TOKEN_INFO.usdc.originAddr,
  ],
  [PARA_ID.CALAMARI]: [
    ...ASSETS_COMMON_MANTA,
    ROUTER_TOKEN_INFO.wbtc.originAddr,
    ROUTER_TOKEN_INFO.weth.originAddr,
    ROUTER_TOKEN_INFO.usdc.originAddr,
    ROUTER_TOKEN_INFO.usdt.originAddr,
  ],
  [PARA_ID.SHADOW]: [
    ROUTER_TOKEN_INFO.csm.originAddr,
  ],

  /* --------------- acala --------------- */
  [PARA_ID.HYDRA]: [
    ...ASSETS_COMMON_HYDRA,
    ROUTER_TOKEN_INFO.dai.originAddr,
    ROUTER_TOKEN_INFO.ape.originAddr,
  ],
  [PARA_ID.MANTA]: [
    ...ASSETS_COMMON_MANTA,
  ],
  [PARA_ID.CRUST]: [
    ROUTER_TOKEN_INFO.cru.originAddr,
  ],
} as const;

export const ROUTE_SUPPORTED_CHAINS_AND_ASSETS = isTestnet
  ? ROUTE_SUPPORTED_CHAINS_AND_ASSETS_DEV
  : ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD;

export const DEST_PARA_ID_TO_ROUTER_WORMHOLE_CHAIN_ID = {
  [PARA_ID.BASILISK]: CHAIN_ID_KARURA,
  [PARA_ID.CALAMARI]: CHAIN_ID_KARURA,
  [PARA_ID.SHADOW]: CHAIN_ID_KARURA,

  [PARA_ID.HYDRA]: CHAIN_ID_ACALA,
  [PARA_ID.MANTA]: CHAIN_ID_ACALA,
  [PARA_ID.CRUST]: CHAIN_ID_ACALA,
} as const;

export const ROUTER_TOKEN_INFO_TESTNET = {
  usdc: {
    originChain: 'ETH',
    originAddr: GOERLI_USDC,
    karuraAddr: '0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7',
    acalaAddr: null,
    decimals: 6,
    fee: 0.04,
  },
} as const;

export const TESTNET_MODE_WARNING = `
  ----------------------------
  🔨 running in testnet mode
  ❌ don't use it for mainnet!
  ----------------------------
`;

export const VERSION = '1.5.1';
