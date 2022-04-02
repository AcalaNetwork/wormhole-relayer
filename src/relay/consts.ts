import {
  CHAIN_ID_KARURA,
  CHAIN_ID_ACALA,
} from '@certusone/wormhole-sdk';

// export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = {
//   [CHAIN_ID_KARURA]: {
//     '0xddb64fe46a91d46ee29420539fc25fd07c5fea3e': '10000000',   // 0.1 WETH
//     '0x2d8be6bf0baa74e0a907016679cae9190e80dd0a': '10000000',   // 0.1 ERC20
//   },
//   [CHAIN_ID_ACALA]: {
//     '0x12345': '10000',
//   },
// };

// thredhold amount is defined as "amount that will show on VAA"
// address should be lower case address to be consistent
export const RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS = {
  [CHAIN_ID_KARURA]: {
    // 0.1 BSC USDT => karura WUSDT 0x478dEFc2Fc2be13a505dafBDF1e5400847E2efF6
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd': '10000000',

    // 0.02 BSC ETH => karura WETH ?
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378': '2000000',
  },
  [CHAIN_ID_ACALA]: {
    // 0.1 BSC USDT => Acala WUSDT 0xb54bA7F042DCAFba0A546e69F69E81b4F59B9C92
    '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd': '10000000',

    // 0.02 BSC ETH => karura WETH ?
    '0xd66c6b4f0be8ce5b39d52e0fd1344c389929b378': '2000000',
  },
};
