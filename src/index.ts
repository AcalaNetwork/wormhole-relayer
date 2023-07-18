import dotenv from 'dotenv';

import { TESTNET_MODE_WARNING, VERSION } from './consts';
import { createApp } from './app';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = async (): Promise<void> => {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`
      ----------------------------------------------------------------
      ⚡               relayer running on port ${PORT}               ⚡
      ----------------------------------------------------------------
      KARURA_ETH_RPC  : ${process.env.KARURA_ETH_RPC}
      ACALA_ETH_RPC   : ${process.env.ACALA_ETH_RPC}
      TESTNET_MODE    : ${process.env.TESTNET_MODE}
      VERSION         : ${VERSION}
      ----------------------------------------------------------------
    `);

    Number(process.env.TESTNET_MODE) && console.log(TESTNET_MODE_WARNING);
  });
};

startServer().catch((e) => {
  console.log('❗️❗️ something is wrong with relayer: ', e);
  process.exit(1);
});
