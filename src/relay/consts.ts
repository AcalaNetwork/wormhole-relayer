import {
  CHAIN_ID_KARURA,
  CHAIN_ID_ACALA,
} from '@certusone/wormhole-sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const isDev = process.env.DEV_MODE;

// thredhold amount is defined as "amount that will show on VAA"
// address should be lower case address to be consistent
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
  },
  [CHAIN_ID_ACALA]: {
  },
};

export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = isDev
  ? RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_DEV
  : RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS_PROD;

export const BALANCE_LOW_THREASHOLD = 20;

export const DEV_MODE_WARNING = `
  ------------------------------
  🔨 running in testnet DEV mode
  ❌ don't use it for production
  ------------------------------
`;