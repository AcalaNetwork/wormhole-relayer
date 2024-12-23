import {
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { parseUnits } from 'ethers/lib/utils';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const isTestnet = Number(process.env.TESTNET_MODE ?? 1);

export const enum ETH_RPC {
  LOCAL = 'http://localhost:8545',

  BSC = 'https://rpc.ankr.com/bsc',
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
  TESTNET: ['https://api.testnet.wormholescan.io'],
  MAINNET: ['https://api.wormholescan.io'],
};

const RELAYER_BASE_URL = 'http://localhost:3111';
// const RELAYER_BASE_URL = 'https://relayer.aca-dev.network';
// const RELAYER_BASE_URL = 'https://relayer.aca-api.network';

export const getRelayerUrl = (path: string) => `${RELAYER_BASE_URL}${path}`;

export const apiUrl = {
  shouldRelay: getRelayerUrl('/shouldRelay'),
  relay: getRelayerUrl('/relay'),

  shouldRouteXcm: getRelayerUrl('/shouldRouteXcm'),
  routeXcm: getRelayerUrl('/routeXcm'),

  shouldRouteWormhole: getRelayerUrl('/shouldRouteWormhole'),
  routeWormhole: getRelayerUrl('/routeWormhole'),
  relayAndRoute: getRelayerUrl('/relayAndRoute'),
  relayAndRouteBatch: getRelayerUrl('/relayAndRouteBatch'),

  shouldRouteHoma: getRelayerUrl('/shouldRouteHoma'),
  routeHoma: getRelayerUrl('/routeHoma'),
  routeHomaAuto: getRelayerUrl('/routeHomaAuto'),
  routeStatus: getRelayerUrl('/routeStatus'),

  shouldRouteEuphrates: getRelayerUrl('/shouldRouteEuphrates'),
  routeEuphrates: getRelayerUrl('/routeEuphrates'),

  shouldRouteDropAndBootstrap: getRelayerUrl('/shouldRouteDropAndBootstrap'),
  routeDropAndBootstrap: getRelayerUrl('/routeDropAndBootstrap'),

  shouldRouteSwapAndLp: getRelayerUrl('/shouldRouteSwapAndLp'),
  routeSwapAndLp: getRelayerUrl('/routeSwapAndLp'),
  rescueSwapAndLp: getRelayerUrl('/rescueSwapAndLp'),

  routerInfo: getRelayerUrl('/routerInfo'),
  saveRouterInfo: getRelayerUrl('/saveRouterInfo'),

  noRoute: getRelayerUrl('/noRoute'),
  version: getRelayerUrl('/version'),
  testTimeout: getRelayerUrl('/testTimeout'),
  health: getRelayerUrl('/health'),
};

/* ---------------
   thredhold amount is defined as "amount that will show on VAA"
   address should be **lower case** address to be consistent
                                                --------------- */
const RELAY_CONFIG_DEV = {
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

const RELAY_CONFIG_PROD = {
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

    // 0.01 jitosol        => Acala jitosol 0xA7fB00459F5896C3bD4df97870b44e868Ae663D7
    j1toso1uck3rlmjorhttrvwy9hj7x8v9yyac6y7kgcpn: '1000000',   // 1 jitosol = 10{9}
  },
};

export const RELAY_CONFIG = isTestnet
  ? RELAY_CONFIG_DEV
  : RELAY_CONFIG_PROD;

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

export const EUPHRATES_ADDR = '0x7Fe92EC600F15cD25253b421bc151c51b0276b7D';
export const EUPHRATES_POOLS = ['0', '1', '2', '3', '6', '7'];
export const SWAP_SUPPLY_TOKENS = [
  ROUTER_TOKEN_INFO.jitosol.acalaAddr,
];

export const RELAYER_ADDR = '0x8B5C2F71eFa2d88A20E0e1c8EDFeA3767B2ab230';

// swap 0.0035 jitosol to 3 ACA for gas drop
export const DROP_SWAP_AMOUNT_JITOSOL = parseUnits('0.0035', 9);
export const DROP_AMOUNT_ACA = parseUnits('3', 12);

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const VERSION = '1.9.0';
