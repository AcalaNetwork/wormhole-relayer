import axios from 'axios';
import request from 'supertest';

import { RELAYER_API, RELAYER_URL } from '../../consts';
import { createApp } from '../../app';

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
