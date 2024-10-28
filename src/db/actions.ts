import { DAY } from '../consts';
import { RouterInfo, sanitizeRouterInfo } from './utils';
import { prisma } from './client';

const upsertRouterInfo = async (data: RouterInfo) => {
  const sanitizedData = sanitizeRouterInfo(data);

  const record = await prisma.routerInfo.upsert({
    where: {
      routerAddr: sanitizedData.routerAddr,
    },
    update: {},
    create: sanitizedData,
  });

  return record;
};

const getRouterInfo = async (filter: Partial<RouterInfo>) => {
  const sanitizedFilter = sanitizeRouterInfo(filter);

  const records = await prisma.routerInfo.findMany({ where: sanitizedFilter });
  return records;
};

const removeRouterInfo = async (filter: Partial<RouterInfo>) => {
  const sanitizedFilter = sanitizeRouterInfo(filter);

  const result = await prisma.routerInfo.deleteMany({ where: sanitizedFilter });
  return result.count;
};

const cleanOldRouterInfo = async (daysOld: number) => {
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
  upsertRouterInfo,
  getRouterInfo,
  removeRouterInfo,
  cleanOldRouterInfo,
};
