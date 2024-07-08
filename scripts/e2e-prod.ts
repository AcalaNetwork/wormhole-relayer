import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { CHAIN_ID_ACALA, CHAIN_ID_KARURA, CHAIN_ID_TO_NAME } from '@certusone/wormhole-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { Wallet } from 'ethers';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

import { BSC_TOKEN, ETH_RPC , RELAYER_URL } from '../src/consts';
import { RouterChainId, getTokenBalance } from '../src/utils';
import { transferErc20, transferFromBSC } from './scriptUtils';
import { transferToken } from '../src/__tests__/testUtils';

dotenv.config({ path: path.join(__dirname, '.env') });
const key = process.env.KEY;
if (!key) throw new Error('KEY is not defined');

const routeXcm = async (chainId: RouterChainId) => {
  console.log(`e2e testing routeXcm on ${CHAIN_ID_TO_NAME[chainId]}`);
  const params = chainId === CHAIN_ID_KARURA
    ? {
      dest: '0x03010200a920010088b3cb383e25bafa7195ab63bc677e1bd6cb27b97cd5d9e91e59f58bf1d3ea6800',
      destParaId: '2090',
      originAddr: ROUTER_TOKEN_INFO.usdc.originAddr,
    } : {
      dest: '0x03010200c91f010088b3cb383e25bafa7195ab63bc677e1bd6cb27b97cd5d9e91e59f58bf1d3ea6800',
      destParaId: '2034',
      originAddr: ROUTER_TOKEN_INFO.dai.originAddr,
    };

  const res = await axios.get(RELAYER_URL.SHOULD_ROUTE_XCM, { params });

  const routerAddr = res.data.data.routerAddr;
  console.log({ routerAddr }); // 0xB1Fa5B2e1fd6ADAa5142B423716A1F3A70ffB142 / 0x27885DCCbdb3F6284091a08a20104b20F8105994

  const provider = new JsonRpcProvider(ETH_RPC.BSC);
  const wallet = new Wallet(key, provider);

  const token = chainId === CHAIN_ID_KARURA ? BSC_TOKEN.USDC : BSC_TOKEN.DAI;
  const bal = await getTokenBalance(token, wallet);
  if (Number(bal) === 0) {
    throw new Error('no token balance to transfer!');
  }
  console.log(`token balance: ${bal}`);

  const signedVAA = await transferFromBSC('0.05', token, routerAddr, chainId, wallet, true);
  console.log({ signedVAA }, 'waiting for relaying and routing ...');

  const routeRes = await axios.post(RELAYER_URL.RELAY_AND_ROUTE, {
    ...params,
    signedVAA,
  });

  console.log(routeRes.data);
};

const routeWormhole = async (chainId: RouterChainId) => {
  console.log(`e2e testing routeWormhole on ${CHAIN_ID_TO_NAME[chainId]}`);
  const originAddr = chainId === CHAIN_ID_KARURA
    ? ROUTER_TOKEN_INFO.usdc.originAddr
    : ROUTER_TOKEN_INFO.dai.originAddr;

  const fromParaId = chainId === CHAIN_ID_KARURA ? '2090' : '2034';

  const params = {
    destAddr: '0xBbBBa9Ebe50f9456E106e6ef2992179182889999',
    targetChainId: 4,   // BSC
    originAddr,
    fromParaId,
  };

  const res = await axios.get(RELAYER_URL.SHOULD_ROUTE_WORMHOLE, { params });

  const routerAddr = res.data.data.routerAddr;
  console.log({ routerAddr }); // 0x0FF0e74513fE82A0c4830309811f1aC1e5d06055 / 0xAAbc44730778B9Dc76fA0B1E65eBeF28D8B7B086

  const ethRpcUrl = chainId === CHAIN_ID_KARURA ? ETH_RPC.KARURA : ETH_RPC.ACALA;
  const provider = new AcalaJsonRpcProvider(ethRpcUrl);
  const wallet = new Wallet(key, provider);

  const token = chainId === CHAIN_ID_KARURA
    ? ROUTER_TOKEN_INFO.usdc.karuraAddr
    : ROUTER_TOKEN_INFO.dai.acalaAddr;

  const bal = await getTokenBalance(token, wallet);
  if (Number(bal) === 0) {
    throw new Error('no token balance to transfer!');
  }
  console.log(`token balance: ${bal}`);

  console.log('xcming to router ...');
  const txHash = await transferToken(routerAddr, wallet, token, 0.05);
  console.log(`router received token: ${txHash}, waiting for routing ...`);

  const routeRes = await axios.post(RELAYER_URL.ROUTE_WORMHOLE, { ...params });
  console.log(routeRes.data);
};

(async () => {
  await routeXcm(CHAIN_ID_ACALA);
  await routeWormhole(CHAIN_ID_ACALA);

  await routeXcm(CHAIN_ID_KARURA);
  await routeWormhole(CHAIN_ID_KARURA);
})();
