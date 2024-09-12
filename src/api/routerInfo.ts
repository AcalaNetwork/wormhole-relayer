import { db } from '../db';
import { routerInfoQuery } from '../utils';

export const getRouterInfo = async (params: routerInfoQuery) => {
  const records = await db.getRouterInfo(params);
  return records;
};

