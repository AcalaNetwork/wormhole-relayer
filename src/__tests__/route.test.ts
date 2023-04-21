import { EvmRpcProvider, sleep } from '@acala-network/eth-providers';
import { CHAIN_ID_BSC, CHAIN_ID_KARURA, hexToUint8Array, parseSequenceFromLogEth, redeemOnEth } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { ContractReceipt, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseUnits } from 'ethers/lib/utils';
import { after, before } from 'mocha';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ERC20, ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import {
  ROUTE_XCM_URL,
  SHOULD_ROUTE_XCM_URL,
  KARURA_USDC_ADDRESS,
  RELAY_AND_ROUTE_URL,
  BSC_USDC_ADDRESS,
  BASILISK_TESTNET_NODE_URL,
  TEST_RELAYER_ADDR,
  SHOULD_ROUTE_WORMHOLE_URL,
  TEST_USER_ADDR,
  ROUTE_WORMHOLE_URL,
  KARURA_CORE_BRIDGE_ADDRESS,
  KARURA_TOKEN_BRIDGE_ADDRESS,
  ETH_RPC_BSC,
  BSC_TOKEN_BRIDGE_ADDRESS,
} from './consts';
import { ETH_USDC, BASILISK_PARA_ID } from '../consts';
import { getSignedVAAFromSequence, transferFromBSCToKarura } from './utils';
import { RelayAndRouteParams, RouteParamsWormhole, RouteParamsXcm } from '../route';

const KARURA_NODE_URL = 'wss://karura-testnet.aca-staging.network/rpc/karura/ws';
// 0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3
const RELAYER_TEST_KEY = 'efb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044';

const encodeXcmDest = (data: any) => {
  // TODO: use api to encode
  return '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
};

const getBasiliskUsdcBalance = async (api: ApiPromise, addr: string) => {
  const balance = await api.query.tokens.accounts(addr, 3);
  return (balance as any).free.toBigInt();
};

const mockXcmToRouter = async (routerAddr: string, signer: Wallet) => {
  const usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, signer);

  expect((await usdc.balanceOf(routerAddr)).toNumber()).to.eq(0);

  const ROUTE_AMOUNT = 0.01;
  const routeAmount = parseUnits(String(ROUTE_AMOUNT), 6);
  if ((await usdc.balanceOf(signer.address)).lt(routeAmount)) {
    throw new Error(`signer ${signer.address} has no enough usdc`);
  }
  await (await usdc.transfer(routerAddr, routeAmount)).wait();

  expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(routeAmount.toBigInt());
};

describe('/routeXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });
  const routeXcm = (params: RouteParamsXcm) => axios.post(ROUTE_XCM_URL, params);

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

  let provider: EvmRpcProvider;
  let api: ApiPromise;

  before(async () => {
    provider = new EvmRpcProvider(KARURA_NODE_URL);
    api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });

    await provider.isReady();
    await api.isReady;
  });

  after(async () => {
    await provider.disconnect();
    await api.disconnect();
  });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      destParaId: BASILISK_PARA_ID,
      originAddr: ETH_USDC,
    };

    const res = await shouldRouteXcm(routeArgs);
    const { routerAddr } = res.data.data;

    console.log('xcming to router ...');
    const relayerSigner = new Wallet(RELAYER_TEST_KEY, provider);
    await mockXcmToRouter(routerAddr, relayerSigner);

    const curBalUser = await getBasiliskUsdcBalance(api, destAddr);
    console.log({ curBalUser });

    console.log('routing ...');
    const routeRes = await routeXcm(routeArgs);
    console.log(`route finished! txHash: ${routeRes.data.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getBasiliskUsdcBalance(api, destAddr);
    console.log({ afterBalUser });

    expect(afterBalUser - curBalUser).to.eq(9800n);  // 10000 - 200
  });

  // describe.skip('when should not route', () => {})
});

describe('/relayAndRoute', () => {
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

  let provider: EvmRpcProvider;
  let api: ApiPromise;
  let usdc: ERC20;

  before(async () => {
    provider = new EvmRpcProvider(KARURA_NODE_URL);
    api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });
    usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, provider);

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
      destParaId: BASILISK_PARA_ID,
      originAddr: ETH_USDC,
    };

    const curBalUser = await getBasiliskUsdcBalance(api, destAddr);
    const curBalRelayer = (await usdc.balanceOf(TEST_RELAYER_ADDR)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    const { routerAddr } = (await shouldRouteXcm(routeArgs)).data.data;
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
    console.log(`route finished! txHash: ${res.data.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getBasiliskUsdcBalance(api, destAddr);
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

describe('/routeWormhole', () => {
  const shouldRouteWormhole = (params: any) => axios.get(SHOULD_ROUTE_WORMHOLE_URL, { params });
  const routeWormhole = (params: RouteParamsWormhole) => axios.post(ROUTE_WORMHOLE_URL, params);

  let providerKarura: EvmRpcProvider;
  let usdcK: ERC20;
  let usdcB: ERC20;

  before(async () => {
    providerKarura = new EvmRpcProvider(KARURA_NODE_URL);
    await providerKarura.isReady();

    usdcK = ERC20__factory.connect(KARURA_USDC_ADDRESS, providerKarura);
    usdcB = ERC20__factory.connect(BSC_USDC_ADDRESS, new JsonRpcProvider(ETH_RPC_BSC));
  });

  after(async () => {
    await providerKarura.disconnect();
  });

  it('when should route', async () => {
    const routeArgs = {
      targetChainId: String(CHAIN_ID_BSC),
      destAddr: TEST_USER_ADDR,
      fromParaId: BASILISK_PARA_ID,
      originAddr: ETH_USDC,
    };

    const res = await shouldRouteWormhole(routeArgs);
    const { routerAddr } = res.data.data;

    console.log('xcming to router ...');
    const relayerSigner = new Wallet(RELAYER_TEST_KEY, providerKarura);
    await mockXcmToRouter(routerAddr, relayerSigner);

    const curBalUser = (await usdcB.balanceOf(TEST_USER_ADDR)).toBigInt();
    const curBalRelayer = (await usdcK.balanceOf(TEST_RELAYER_ADDR)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeWormhole(routeArgs);
    const txHash = routeRes.data.data;
    console.log(`route finished! txHash: ${txHash}`);

    // router should be destroyed
    expect((await usdcK.balanceOf(routerAddr)).toBigInt()).to.eq(0n);
    const routerCode = await providerKarura.getCode(routerAddr);
    expect(routerCode).to.eq('0x');

    /*  ---------- should be able to redeem from eth ----------  */
    const depositReceipt = await providerKarura.getTXReceiptByHash(txHash);
    const sequence = parseSequenceFromLogEth(depositReceipt as ContractReceipt, KARURA_CORE_BRIDGE_ADDRESS);
    console.log('route to wormhole complete', { sequence }, 'waiting for VAA...');

    const signedVAA = await getSignedVAAFromSequence(
      sequence,
      CHAIN_ID_KARURA,
      KARURA_TOKEN_BRIDGE_ADDRESS,
    );
    console.log({ signedVAA });

    const providerBSC = new JsonRpcProvider(ETH_RPC_BSC);
    const relayerSignerBSC = new Wallet(RELAYER_TEST_KEY, providerBSC);
    const receipt = await redeemOnEth(
      BSC_TOKEN_BRIDGE_ADDRESS,
      relayerSignerBSC,
      hexToUint8Array(signedVAA),
    );
    console.log(`redeem finished! txHash: ${receipt.transactionHash}`);

    const afterBalUser = (await usdcB.balanceOf(TEST_USER_ADDR)).toBigInt();
    const afterBalRelayer = (await usdcK.balanceOf(TEST_RELAYER_ADDR)).toBigInt();
    console.log({ afterBalUser, afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(200n);
    expect(afterBalUser - curBalUser).to.eq(9800n);  // 10000 - 200
  });

  // describe.skip('when should not route', () => {})
});

