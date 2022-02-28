import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';

import { relay, checkShouldRelay } from './relay/main';

const startServer = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.get('/shouldRelay', checkShouldRelay);

  app.listen(3111, () => {
    console.log('Server running on port 3111');
  });
};

startServer();
