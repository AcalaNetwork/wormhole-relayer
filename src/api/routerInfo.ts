import { RouterInfo, db } from '../db';
import {
  _populateRelayTx,
  _populateRouteTx,
} from '../utils';

export const getRouterInfo = async (params: Partial<RouterInfo>) => {
  const records = await db.getRouterInfo(params);
  return records;
};

