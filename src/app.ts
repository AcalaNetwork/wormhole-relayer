import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import { checkShouldRelay, getVersion, relay } from './api/relay';
import { errorHandler } from './middlewares/error';
import { testTimeout } from './utils/utils';
import router from './middlewares/router';

export const createApp = () => {
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

  return app;
};
