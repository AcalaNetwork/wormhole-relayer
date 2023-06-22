import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { relay, checkShouldRelay, getVersion } from './relay';
import { TESTNET_MODE_WARNING, VERSION } from './consts';
import router from './middlewares/router';
import { errorHandler } from './middlewares/error';
import { testTimeout } from './utils';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = async (): Promise<void> => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.post('/testTimeout', testTimeout);
  app.get('/shouldRelay', checkShouldRelay);
  app.get('/version', getVersion);

  app.use(router);
  app.use(errorHandler);

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
