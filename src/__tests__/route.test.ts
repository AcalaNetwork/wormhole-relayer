import { AcalaJsonRpcProvider, sleep } from '@acala-network/eth-providers';
import { CHAIN_ID_BSC, CHAIN_ID_KARURA, hexToUint8Array, parseSequenceFromLogEth, redeemOnEth } from '@certusone/wormhole-sdk';
import axios, { AxiosError } from 'axios';
import { expect } from 'chai';
import { ContractReceipt, Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { parseUnits } from 'ethers/lib/utils';
import { after, before } from 'mocha';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';

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

const KARURA_ETH_RPC = 'https://eth-rpc-karura-testnet.aca-staging.network';
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

  let provider: AcalaJsonRpcProvider;
  let api: ApiPromise;

  before(async () => {
    provider = new AcalaJsonRpcProvider(KARURA_ETH_RPC);
    api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });

    await api.isReady;
  });

  after(async () => {
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

  const provider = new AcalaJsonRpcProvider(KARURA_ETH_RPC);
  const api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });
  const usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, provider);

  before(async () => {
    await api.isReady;
  });

  after(async () => {
    console.log('disconnecting ...');
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
    usdc.once(wormholeWithdrawFilter, (from, to, value, event) => {
      console.log(`relay finished! txHash: ${event.transactionHash}`);
    });

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

  it('when should not route', async () => {
    const routeArgs = {
      dest,
      destParaId: BASILISK_PARA_ID,
      originAddr: ETH_USDC,
    };

    try {
      await relayAndRoute({
        ...routeArgs,

        // bridge 0.000001 USDC
        signedVAA: '010000000001004ba23fa55bcb370773bdba954523ea305f96f814f51ce259fb327b57d985eec86a0f69bf46c4bb444d09b1d70e3b2aaa434639ec3ae93f5d0671b3e38055cf3501648726ae4d36000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a0900000000000012580f01000000000000000000000000000000000000000000000000000000000000000100000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00020000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expect((err as AxiosError).response?.data).to.deep.contain({
        error: 'token amount too small to relay',
        msg: 'cannot relay this request!',
      });
    }

    try {
      await relayAndRoute({
        ...routeArgs,

        // bridge 10 TKN
        signedVAA: '01000000000100689102e0be499c096acd1ac49a34216a32f8c19f1b053e0ff47e0a994ea302b50261b4c1feab4ae933fa8de83bd86efde12cc3b82da00b9b8ccc2d502e145ad2006487368e8f3a010000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000125c0f01000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000009c8bcccdb17545658c6b84591567c6ed9b4d55bb000b0000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expect((err as AxiosError).response?.data).to.deep.contain({
        error: 'unsupported token',
        msg: 'cannot relay this request!',
      });
    }
  });
});

describe('/routeWormhole', () => {
  const shouldRouteWormhole = (params: any) => axios.get(SHOULD_ROUTE_WORMHOLE_URL, { params });
  const routeWormhole = (params: RouteParamsWormhole) => axios.post(ROUTE_WORMHOLE_URL, params);

  const providerKarura = new AcalaJsonRpcProvider(KARURA_ETH_RPC);
  const usdcK = ERC20__factory.connect(KARURA_USDC_ADDRESS, providerKarura);
  const usdcB = ERC20__factory.connect(BSC_USDC_ADDRESS, new JsonRpcProvider(ETH_RPC_BSC));

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
    const depositReceipt = await providerKarura.getTransactionReceipt(txHash);
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

