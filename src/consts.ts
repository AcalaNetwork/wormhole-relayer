import {
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const isTestnet = Number(process.env.TESTNET_MODE ?? 1);

export const enum ETH_RPC {
  BSC = 'https://endpoints.omniatech.io/v1/bsc/mainnet/public',
  KARURA = 'https://eth-rpc-karura.aca-api.network',
  ACALA = 'https://eth-rpc-acala.aca-api.network',

  BSC_TESTNET = 'https://endpoints.omniatech.io/v1/bsc/testnet/public',
  GOERLI = 'https://rpc.ankr.com/eth_goerli',
};

export const enum BSC_TOKEN {
  USDC = '0xB04906e95AB5D797aDA81508115611fee694c2b3',
  DAI = '0x3413a030EF81a3dD5a302F4B4D11d911e12ed337',
  USDT = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
};

export const WORMHOLE_GUARDIAN_RPC = {
  TESTNET: ['https://wormhole-v2-testnet-api.certus.one'],
  MAINNET: ['https://wormhole-v2-mainnet-api.certus.one'],
};

const RELAYER_BASE_URL = 'http://localhost:3111';
// const RELAYER_BASE_URL = 'https://relayer.aca-dev.network';
// const RELAYER_BASE_URL = 'https://relayer.aca-api.network';
export const RELAYER_URL = {
  SHOULD_RELAY: `${RELAYER_BASE_URL}/shouldRelay`,
  RELAY: `${RELAYER_BASE_URL}/relay`,

  SHOULD_ROUTE_XCM: `${RELAYER_BASE_URL}/shouldRouteXcm`,
  ROUTE_XCM: `${RELAYER_BASE_URL}/routeXcm`,

  SHOULD_ROUTE_WORMHOLE: `${RELAYER_BASE_URL}/shouldRouteWormhole`,
  ROUTE_WORMHOLE: `${RELAYER_BASE_URL}/routeWormhole`,
  RELAY_AND_ROUTE: `${RELAYER_BASE_URL}/relayAndRoute`,
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

    // 0.05 Goerli USDC => karura WUSDC 0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7
    '0x07865c6e87b9f70255377e024ace6630c1eaa37f': '50000',
  },
  [CHAIN_ID_ACALA]: {
    // 0.1 BSC USDT => Acala WUSDT 0xb54bA7F042DCAFba0A546e69F69E81b4F59B9C92
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd': '10000000',

    // 0.02 BSC ETH => karura WETH ?
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378': '2000000',

    // 0.05 Goerli USDC => karura WUSDC 0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7
    '0x07865c6e87b9f70255377e024ace6630c1eaa37f': '50000',
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

export const TESTNET_MODE_WARNING = `
  ----------------------------
  🔨 running in testnet mode
  ❌ don't use it for mainnet!
  ----------------------------
`;

export const VERSION = '1.3.10';
