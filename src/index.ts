import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { relay, checkShouldRelay, getVersion } from './relay';
import { TESTNET_MODE_WARNING, VERSION } from './consts';
import { handleRelayAndRoute, handleRouteWormhole, handleRouteXcm, shouldRouteWormhole, shouldRouteXcm } from './route';
import { validateRelayAndRouteArgs, validateRouteXcmArgs, validateshouldRouteXcmArgs } from './middlewares/validate';
import { Wallet } from 'ethers';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = async (): Promise<void> => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.post('/routeWormhole', handleRouteWormhole);
  app.post('/routeXcm', validateRouteXcmArgs(), handleRouteXcm);
  app.post('/relayAndRoute', validateRelayAndRouteArgs(), handleRelayAndRoute);

  app.get('/shouldRelay', checkShouldRelay);
  app.get('/shouldRouteWormhole', shouldRouteWormhole);
  app.get('/shouldRouteXcm', validateshouldRouteXcmArgs(), shouldRouteXcm);

  app.get('/version', getVersion);

  console.log(new Wallet(process.env.KARURA_PRIVATE_KEY as string).address);

  app.listen(PORT, () => {
    console.log(`
      ----------------------------------------------------------------
      ⚡               relayer running on port ${PORT}               ⚡
      ----------------------------------------------------------------
      KARURA_ETH_RPC  : ${process.env.KARURA_ETH_RPC}
      ACALA_ETH_RPC   : ${process.env.ACALA_ETH_RPC}
      KARURA_NODE_URL : ${process.env.KARURA_NODE_URL}
      ACALA_NODE_URL  : ${process.env.ACALA_NODE_URL}
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
