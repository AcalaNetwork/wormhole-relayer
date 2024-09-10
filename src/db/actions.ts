import { DAY } from '../consts';
import { prisma } from './client';

export interface RouterInfo {
  params: string;
  factoryAddr: string;
  recipient: string;
  feeAddr: string;
  routerAddr: string;
}

const insertRouterInfo = async (data: RouterInfo) => {
  const record = await prisma.routerInfo.create({ data });
  return record;
};

const getRouterInfo = async (filter: Partial<RouterInfo>) => {
  const records = await prisma.routerInfo.findMany({ where: filter });
  return records;
};

const removeRouterInfo = async (daysOld: number) => {
  const cutoffDate = new Date(Date.now() - daysOld * DAY);

  const result = await prisma.routerInfo.deleteMany({
    where: {
      timestamp: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
};

export const db = {
  insertRouterInfo,
  getRouterInfo,
  removeRouterInfo,
};
