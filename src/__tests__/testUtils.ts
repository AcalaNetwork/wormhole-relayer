import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import axios from 'axios';
import request from 'supertest';

import { ETH_RPC, RELAYER_API, RELAYER_URL } from '../consts';
import { TEST_USER_PRIVATE_KEY } from './testConsts';
import { createApp } from '../app';
import { expect } from 'vitest';
import { transferFromBSC } from '../utils/utils';

export const transferFromBSCToKaruraTestnet = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
) => {
  const provider = new JsonRpcProvider(ETH_RPC.BSC);
  const wallet = new Wallet(TEST_USER_PRIVATE_KEY, provider);

  return await transferFromBSC(
    amount,
    sourceAsset,
    recipientAddr,
    CHAIN_ID_KARURA,
    wallet,
    false,
  );
};

const app = createApp();
export const appReq = request(app);

export const shouldRouteXcm = process.env.COVERAGE
  ? async (params: any) => {
    const res = await appReq.get(RELAYER_API.SHOULD_ROUTE_XCM).query(params);
    if (res.error) {
      throw res.error;
    };
    return JSON.parse(res.text);
  }
  : async (params: any) => {
    const res = await axios.get(RELAYER_URL.SHOULD_ROUTE_XCM, { params });
    return res.data;
  };

export const shouldRouteWormhole = process.env.COVERAGE
  ? async (params: any) => {
    const res = await appReq.get(RELAYER_API.SHOULD_ROUTE_WORMHOLE).query(params);
    if (res.error) {
      throw res.error;
    };
    return JSON.parse(res.text);
  }
  : async (params: any) => {
    const res = await axios.get(RELAYER_URL.SHOULD_ROUTE_WORMHOLE, { params });
    return res.data;
  };

export const shouldRelay = process.env.COVERAGE
  ? async (params: any) => {
    const res = await appReq.get(RELAYER_API.SHOULD_RELAY).query(params);
    if (res.error) {
      throw res.error;
    };
    return JSON.parse(res.text);
  }
  : async (params: any) => {
    const res = await axios.get(RELAYER_URL.SHOULD_RELAY, { params });
    return res.data;
  };

export const expectError = (err: any, msg: any, code: number) => {
  if (axios.isAxiosError(err)) {
    expect(err.response?.status).to.equal(code);
    expect(err.response?.data.error).to.deep.equal(msg);
  } else {    // HttpError from supertest
    expect(err.status).to.equal(code);
    expect(JSON.parse(err.text).error).to.deep.equal(msg);
  }
};
