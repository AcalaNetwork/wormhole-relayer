import { EvmPlatform } from '@wormhole-foundation/connect-sdk-evm';
import { Wormhole } from '@wormhole-foundation/connect-sdk';

import { FUJI_TOKEN } from '../src/consts';
import { TEST_ADDR_USER } from '../src/__tests__/utils/testConsts';
import { completeTransfer, transferFromFujiToKaruraTestnet } from '../src/__tests__/utils/wormhole';

(async () => {
  const network = 'Testnet';
  const wh = new Wormhole(network, [EvmPlatform]);

  const txId = await transferFromFujiToKaruraTestnet(wh, '0.0001', FUJI_TOKEN.USDC, TEST_ADDR_USER);
  await completeTransfer(wh, txId);
})();
