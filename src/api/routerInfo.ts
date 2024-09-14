import { CHAIN_ID_ACALA } from '@certusone/wormhole-sdk';
import { RouterInfoQuery, RouterInfoUpdate, getChainConfig } from '../utils';
import { db } from '../db';

export const getRouterInfo = async (params: RouterInfoQuery) => {
  return await db.getRouterInfo(params);
};

export const saveRouterInfo = async (params: RouterInfoUpdate) => {
  // only supports pool 7 on Acala for now
  const { feeAddr, dropAndSwapStakeFactoryAddr } = await getChainConfig(CHAIN_ID_ACALA);

  return await db.upsertRouterInfo({
    ...params,
    feeAddr: feeAddr!,
    factoryAddr: dropAndSwapStakeFactoryAddr!,
  });
};
