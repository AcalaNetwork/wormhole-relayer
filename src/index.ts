import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { relay, checkShouldRelay, health } from './relay/main';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.get('/shouldRelay', checkShouldRelay);
  app.get('/health', health);

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
      ----------------------------------------------------------------
    `);
  });
};

startServer();
