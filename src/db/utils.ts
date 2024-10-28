import { isEvmAddress } from '@acala-network/eth-providers';
import { prisma } from './client';

export interface RouterInfo {
  params: string;       // stringified JSON params
  factoryAddr: string;
  recipient: string;
  feeAddr: string;
  routerAddr: string;
}

export const connectDb = async () => {
  try {
    await prisma.$connect();
  } catch (err) {
    console.error('❗️ db connection failed!');
    throw err;
  }
};

const _sanitizeParams = (params: string) => {
  let jsonParams: Record<string, string> = {};
  try {
    jsonParams = JSON.parse(params);
  } catch (err) {
    return params;
  }

  Object.keys(jsonParams).forEach(key => {
    if (isEvmAddress(jsonParams[key])) {
      jsonParams[key] = jsonParams[key].toLowerCase();
    }
  });

  return JSON.stringify(jsonParams);
};

// use lowercase for all addrs to be consistent
export const sanitizeRouterInfo = <T extends Partial<RouterInfo>>(info: T): T => {
  return {
    ...(info.params && { params: _sanitizeParams(info.params) }),
    ...(info.factoryAddr && { factoryAddr: info.factoryAddr.toLowerCase() }),
    ...(info.recipient && { recipient: info.recipient.toLowerCase() }),
    ...(info.feeAddr && { feeAddr: info.feeAddr.toLowerCase() }),
    ...(info.routerAddr && { routerAddr: info.routerAddr.toLowerCase() }),
  } as T;
};
