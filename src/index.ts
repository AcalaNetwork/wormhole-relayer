import cors from 'cors';
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { relay, checkShouldRelay } from './relay/main';

dotenv.config({ path: '.env' });
const PORT = process.env.PORT || 3111;

const startServer = () => {
  const app = express();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/relay', relay);
  app.get('/shouldRelay', checkShouldRelay);

  app.listen(PORT, () => {
    console.log(`relayer running on port ${PORT}`);
  });
};

startServer();
