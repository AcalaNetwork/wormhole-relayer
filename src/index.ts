import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { relay, checkShouldRelay, getVersion } from './relay/main';
import { TESTNET_MODE_WARNING } from './relay/consts';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = async (): Promise<void> => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.get('/shouldRelay', checkShouldRelay);
  app.get('/version', getVersion);

  app.listen(PORT, () => {
    console.log(`
      ----------------------------------------------------------------
      ⚡               relayer running on port ${PORT}               ⚡
      ----------------------------------------------------------------
      KARURA_RPC_URL_WS        : ${process.env.KARURA_RPC_URL_WS}
      ACALA_RPC_URL_WS         : ${process.env.ACALA_RPC_URL_WS}
      KARURA_RPC_URL_HTTP      : ${process.env.KARURA_RPC_URL_HTTP}
      ACALA_RPC_URL_HTTP       : ${process.env.ACALA_RPC_URL_HTTP}
      KARURA_SUBSTRATE_NODE_URL: ${process.env.KARURA_SUBSTRATE_NODE_URL}
      ACALA_SUBSTRATE_NODE_URL : ${process.env.ACALA_SUBSTRATE_NODE_URL}
      TESTNET_MODE             : ${process.env.TESTNET_MODE}
      ----------------------------------------------------------------
    `);

    Number(process.env.TESTNET_MODE) && console.log(TESTNET_MODE_WARNING);
  });
};

startServer().catch((e) => {
  console.log('❗️❗️ something is wrong with relayer: ', e);
  process.exit(1);
});
