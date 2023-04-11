import { EvmRpcProvider, sleep } from '@acala-network/eth-providers';
import { ERC20__factory } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { after, before } from 'mocha';
import { ApiPromise, WsProvider } from '@polkadot/api';
import {
  ROUTE_XCM_URL,
  SHOULD_ROUTE_XCM_URL,
  KARURA_USDC_ADDRESS,
  RELAY_AND_ROUTE_URL,
  BSC_USDC_ADDRESS,
  BASILISK_TESTNET_NODE_URL,
  TEST_RELAYER_ADDR,
} from './consts';

import { RelayAndRouteParams, RouteParamsXcm } from '../route';
import { transferFromBSCToKarura } from './utils';
import { BASILISK_PARA_ID } from '../consts';

const KARURA_NODE_URL = 'wss://karura-testnet.aca-staging.network/rpc/karura/ws';
const TEST_KEY = 'efb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044';

const mockXcmToRouter = async (routerAddr: string, signer: Wallet) => {
  const usdc = new ERC20__factory(signer).attach(KARURA_USDC_ADDRESS);

  expect((await usdc.balanceOf(routerAddr)).toNumber()).to.eq(0);

  const ROUTE_AMOUNT = 0.01;
  const routeAmount = parseUnits(String(ROUTE_AMOUNT), 6);
  await (await usdc.transfer(routerAddr, routeAmount)).wait();

  expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(routeAmount.toBigInt());
};

describe('/routeXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });
  const routeXcm = (params: RouteParamsXcm) => axios.post(ROUTE_XCM_URL, params);

  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  const provider = new EvmRpcProvider(KARURA_NODE_URL);

  before(async () => {
    await provider.isReady();
  });

  after(async () => {
    await provider.disconnect();
  });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      routerChainId: '11',
      destParaId: BASILISK_PARA_ID,
      originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    };

    const res = await shouldRouteXcm(routeArgs);
    const { routerAddr } = res.data;

    console.log('xcming to router ...');
    const signer = new Wallet(TEST_KEY, provider);
    await mockXcmToRouter(routerAddr, signer);

    console.log('routing ...');
    const routeRes = await routeXcm(routeArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    await provider.disconnect();
  });

  // describe.skip('when should not route', () => {})
});

const encodeXcmDest = (data: any) => {
  // TODO: use api to encode
  return '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
}

describe.only('/relayAndRoute', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });
  const relayAndRoute = (params: RelayAndRouteParams) => axios.post(RELAY_AND_ROUTE_URL, params);

  const destAddr = 'bXmPf7DcVmFuHEmzH3UX8t6AUkfNQW8pnTeXGhFhqbfngjAak';
  const dest = encodeXcmDest({
    V3: {
      parents: 1,
      interior: {
        X2: [
          { parachain: 2090 },
          { accountId32: destAddr },
        ],
      },
    },
  });

  const provider = new EvmRpcProvider(KARURA_NODE_URL);
  const api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });

  const usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, provider);

  const getUsdcBalance = async (addr: string) => {
    const balance = await api.query.tokens.accounts(addr, 3);
    return (balance as any).free.toBigInt();
  };

  before(async () => {
    await provider.isReady();
    await api.isReady;
  });

  after(async () => {
    console.log('disconnecting ...');
    await provider.disconnect();
    await api.disconnect();
  });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      routerChainId: '11',
      destParaId: BASILISK_PARA_ID,
      originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    };

    const curBalUser = await getUsdcBalance(destAddr);
    const curBalRelayer = (await usdc.balanceOf(TEST_RELAYER_ADDR)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    const { routerAddr } = (await shouldRouteXcm(routeArgs)).data;
    console.log({ routerAddr });

    const signedVAA = await transferFromBSCToKarura('0.01', BSC_USDC_ADDRESS, routerAddr);
    console.log({ signedVAA });

    const relayAndRouteArgs = {
      ...routeArgs,
      signedVAA,
    };

    const wormholeWithdrawFilter = usdc.filters.Transfer(
      '0x0000000000000000000000000000000000000000',
      routerAddr,
    );
    provider.addEventListener('logs', data => {
      console.log(`relay finished! txHash: ${data.result.transactionHash}`);
    }, wormholeWithdrawFilter);

    const res = await relayAndRoute(relayAndRouteArgs);
    console.log(`route finished! txHash: ${res.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getUsdcBalance(destAddr);
    const afterBalRelayer = (await usdc.balanceOf(TEST_RELAYER_ADDR)).toBigInt();
    console.log({ afterBalUser, afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(200n);
    expect(afterBalUser - curBalUser).to.eq(9800n);  // 10000 - 200
    expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  // describe.skip('when should not route', () => {});
});

