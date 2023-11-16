import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import {
  checkShouldRelay,
  getVersion,
  relay,
  testTimeout,
} from './api';
import { errorHandler, router } from './middlewares';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/testTimeout', testTimeout);
  app.post('/relay', relay);
  app.get('/shouldRelay', checkShouldRelay);
  app.get('/version', getVersion);

  app.use(router);
  app.use(errorHandler);

  return app;
};
