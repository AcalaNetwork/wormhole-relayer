import { RouterInfo, db } from '../db';

export const getRouterInfo = async (params: Partial<RouterInfo>) => {
  const records = await db.getRouterInfo(params);
  return records;
};

