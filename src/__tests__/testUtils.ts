import { ApiPromise } from '@polkadot/api';
import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { expect } from 'vitest';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import axios from 'axios';
import request from 'supertest';

import { ETH_RPC, RELAYER_API, RELAYER_URL } from '../consts';
import { KARURA_USDC_ADDRESS, TEST_KEY } from './testConsts';
import { createApp } from '../app';
import { transferFromAvax } from '../utils';

export const transferFromFujiToKaruraTestnet = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
) => {
  const provider = new JsonRpcProvider(ETH_RPC.FUJI);
  const wallet = new Wallet(TEST_KEY.USER, provider);

  const bal = await wallet.getBalance();
  if (bal.lt(parseEther('0.03'))) {
    throw new Error('insufficient balance on fuji!');
  }

  return await transferFromAvax(
    amount,
    sourceAsset,
    recipientAddr,
    CHAIN_ID_KARURA,
    wallet,
    false,
  );
};

export const encodeXcmDest = (_data: any) => {
  // TODO: use api to encode
  return '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
};

export const getBasiliskUsdcBalance = async (api: ApiPromise, addr: string) => {
  const balance = await api.query.tokens.accounts(addr, 3);
  return (balance as any).free.toBigInt();
};

export const transferToRouter = async (
  routerAddr: string,
  signer: Wallet,
  tokenAddr = KARURA_USDC_ADDRESS,
  amount = 0.001,
) => {
  const token = ERC20__factory.connect(tokenAddr, signer);

  const decimals = await token.decimals();
  const routeAmount = parseUnits(String(amount), decimals);

  const routerBal = await token.balanceOf(routerAddr);
  if (routerBal.gt(0)) {
    expect(routerBal.toBigInt()).to.eq(routeAmount.toBigInt());
  } else {
    const signerTokenBal = await token.balanceOf(signer.address);
    if (signerTokenBal.lt(routeAmount)) {
      throw new Error(`signer ${signer.address} has no enough token [${tokenAddr}] to transfer! ${signerTokenBal.toBigInt()} < ${routeAmount.toBigInt()}`);
    }
    await (await token.transfer(routerAddr, routeAmount)).wait();
  }
};
export const mockXcmToRouter = transferToRouter;

export const expectError = (err: any, msg: any, code: number) => {
  if (axios.isAxiosError(err)) {
    expect(err.response?.status).to.equal(code);
    expect(err.response?.data.error).to.deep.equal(msg);
  } else {    // HttpError from supertest
    expect(err.status).to.equal(code);
    expect(JSON.parse(err.text).error).to.deep.equal(msg);
  }
};

export const expectErrorData = (err: any, expectFn: any) => {
  expectFn(
    axios.isAxiosError(err)
      ? err.response?.data
      : JSON.parse(err.text),
  );
};

/* ------------------------------------------------------------------ */
/* ----------------------    test endpoints    ---------------------- */
/* ------------------------------------------------------------------ */
const app = createApp();
const appReq = request(app);

const _supertestGet = (endpoint: string) => async (params: any) => {
  const res = await appReq.get(endpoint).query(params);
  if (res.error) {
    throw res.error;
  };
  try {
    return JSON.parse(res.text);
  } catch {
    return res.text;
  }
};

const _supertestPost = (endpoint: string) => async (params: any) => {
  const res = await appReq.post(endpoint).send(params);
  if (res.error) {
    throw res.error;
  };
  try {
    return JSON.parse(res.text);
  } catch {
    return res.text;
  }
};

const _axiosGet = (url: string) => async (params: any) => {
  const res = await axios.get(url, { params });
  return res.data;
};

const _axiosPost = (url: string) => async (params: any) => {
  const res = await axios.post(url, { ...params });
  return res.data;
};

export const shouldRouteXcm = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.SHOULD_ROUTE_XCM)
  : _axiosGet(RELAYER_URL.SHOULD_ROUTE_XCM);

export const shouldRouteWormhole = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.SHOULD_ROUTE_WORMHOLE)
  : _axiosGet(RELAYER_URL.SHOULD_ROUTE_WORMHOLE);

export const shouldRelay = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.SHOULD_RELAY)
  : _axiosGet(RELAYER_URL.SHOULD_RELAY);

export const relay = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.RELAY)
  : _axiosPost(RELAYER_URL.RELAY);

export const routeXcm = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.ROUTE_XCM)
  : _axiosPost(RELAYER_URL.ROUTE_XCM);

export const relayAndRoute = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.RELAY_AND_ROUTE)
  : _axiosPost(RELAYER_URL.RELAY_AND_ROUTE);

export const relayAndRouteBatch = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.RELAY_AND_ROUTE_BATCH)
  : _axiosPost(RELAYER_URL.RELAY_AND_ROUTE_BATCH);

export const routeWormhole = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.ROUTE_WORMHOLE)
  : _axiosPost(RELAYER_URL.ROUTE_WORMHOLE);

export const noRoute = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.NO_ROUTE)
  : _axiosPost(RELAYER_URL.NO_ROUTE);

export const version = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.VERSION)
  : _axiosGet(RELAYER_URL.VERSION);

export const testTimeout = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.TEST_TIMEOUT)
  : _axiosPost(RELAYER_URL.TEST_TIMEOUT);

export const health = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.HEALTH)
  : _axiosGet(RELAYER_URL.HEALTH);

export const shouldRouteHoma = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.SHOULD_ROUTER_HOMA)
  : _axiosGet(RELAYER_URL.SHOULD_ROUTER_HOMA);

export const routeHoma = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.ROUTE_HOMA)
  : _axiosPost(RELAYER_URL.ROUTE_HOMA);

export const shouldRouteEuphrates = process.env.COVERAGE
  ? _supertestGet(RELAYER_API.SHOULD_ROUTER_EUPHRATES)
  : _axiosGet(RELAYER_URL.SHOULD_ROUTER_EUPHRATES);

export const routeEuphrates = process.env.COVERAGE
  ? _supertestPost(RELAYER_API.ROUTE_EUPHRATES)
  : _axiosPost(RELAYER_URL.ROUTE_EUPHRATES);
