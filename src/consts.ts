import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import {
  CHAIN_ID_KARURA,
  CHAIN_ID_ACALA,
} from '@certusone/wormhole-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const isTestnet = Number(process.env.TESTNET_MODE ?? 1);

// thredhold amount is defined as "amount that will show on VAA"
// address should be **lower case** address to be consistent
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

  HYDRA = '2034'
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

const ROUTE_SUPPORTED_CHAINS_AND_ASSETS_PROD = {
  [PARA_ID.BASILISK]: [
    ROUTER_TOKEN_INFO.KARURA.usdc.originAddr,
    ROUTER_TOKEN_INFO.KARURA.weth.originAddr,
    ROUTER_TOKEN_INFO.KARURA.wbtc.originAddr,
  ],
  [PARA_ID.CALAMARI]: [
  ],
  [PARA_ID.SHADOW]: [
    ROUTER_TOKEN_INFO.KARURA.csm.originAddr,
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
} as const;

export const TESTNET_MODE_WARNING = `
  ----------------------------
  🔨 running in testnet mode
  ❌ don't use it for mainnet!
  ----------------------------
`;

export const VERSION = '1.3.6';
