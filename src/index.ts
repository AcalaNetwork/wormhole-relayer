import dotenv from 'dotenv';

import { TESTNET_MODE_WARNING, VERSION } from './consts';
import { connectDb } from './db';
import { createApp } from './app';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = async (): Promise<void> => {
  await connectDb();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`
      ----------------------------------------------------------------
      ⚡               relayer running on port ${PORT}               ⚡
      ----------------------------------------------------------------
      KARURA_ETH_RPC  : ${process.env.KARURA_ETH_RPC}
      KARURA_NODE_URL  : ${process.env.KARURA_NODE_URL}
      ACALA_ETH_RPC   : ${process.env.ACALA_ETH_RPC}
      ACALA_NODE_URL   : ${process.env.ACALA_NODE_URL}
      TESTNET_MODE    : ${process.env.TESTNET_MODE}
      VERSION         : ${VERSION}
      ----------------------------------------------------------------
    `);

    Number(process.env.TESTNET_MODE) && console.log(TESTNET_MODE_WARNING);
  });
};

startServer().catch(e => {
  console.log('❗️ server failed to start: ', e);
  process.exit(1);
});
