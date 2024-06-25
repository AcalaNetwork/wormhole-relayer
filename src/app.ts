import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';

import { errorHandler, router } from './middlewares';
import {
  getVersion,
  testTimeout,
} from './api';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/testTimeout', testTimeout);
  app.get('/version', getVersion);

  app.use(router);
  app.use(errorHandler);

  return app;
};
