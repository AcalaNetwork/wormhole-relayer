import { AcalaJsonRpcProvider, sleep } from '@acala-network/eth-providers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { CHAIN_ID_AVAX, CHAIN_ID_KARURA, CONTRACTS, hexToUint8Array, parseSequenceFromLogEth, redeemOnEth } from '@certusone/wormhole-sdk';
import { ContractReceipt, Wallet } from 'ethers';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { JsonRpcProvider } from '@ethersproject/providers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  BASILISK_TESTNET_NODE_URL,
  KARURA_USDC_ADDRESS,
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import { ETH_RPC, FUJI_TOKEN, GOERLI_USDC, PARA_ID } from '../consts';
import {
  encodeXcmDest,
  expectError,
  getBasiliskUsdcBalance,
  mockXcmToRouter,
  relayAndRoute,
  relayAndRouteBatch,
  routeWormhole,
  routeXcm,
  shouldRouteWormhole,
  shouldRouteXcm,
  transferFromFujiToKaruraTestnet,
} from './testUtils';
import { getSignedVAAFromSequence } from '../utils';

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

const providerKarura = new AcalaJsonRpcProvider(ETH_RPC.KARURA_TESTNET);
const relayerSigner = new Wallet(TEST_KEY.RELAYER, providerKarura);

describe('/routeXcm', () => {
  const api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });

  beforeAll(async () => { await api.isReady; });
  afterAll(async () => { await api.disconnect(); });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      destParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    const res = await shouldRouteXcm(routeArgs);
    const { routerAddr } = res.data;

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, relayerSigner);

    const curBalUser = await getBasiliskUsdcBalance(api, destAddr);
    console.log({ curBalUser });

    console.log('routing ...');
    const routeRes = await routeXcm(routeArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getBasiliskUsdcBalance(api, destAddr);
    console.log({ afterBalUser });

    expect(afterBalUser - curBalUser).to.eq(800n);  // 1000 - 200
  });

  // describe.skip('when should not route', () => {})
});

describe('/relayAndRoute', () => {
  const api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });
  const usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, providerKarura);

  beforeAll(async () => { await api.isReady; });
  afterAll(async () => { await api.disconnect(); });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      destParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    const curBalUser = await getBasiliskUsdcBalance(api, destAddr);
    const curBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    const { routerAddr } = (await shouldRouteXcm(routeArgs)).data;
    console.log({ routerAddr });

    const signedVAA = await transferFromFujiToKaruraTestnet('0.001', FUJI_TOKEN.USDC, routerAddr);
    console.log({ signedVAA });

    const relayAndRouteArgs = {
      ...routeArgs,
      signedVAA,
    };

    const wormholeWithdrawFilter = usdc.filters.Transfer(
      '0x0000000000000000000000000000000000000000',
      routerAddr,
    );
    usdc.once(wormholeWithdrawFilter, (_from, _to, _value, event) => {
      console.log(`relay finished! txHash: ${event.transactionHash}`);
    });

    const res = await relayAndRoute(relayAndRouteArgs);
    console.log(`route finished! txHash: ${res.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getBasiliskUsdcBalance(api, destAddr);
    const afterBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalUser, afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(200n);
    expect(afterBalUser - curBalUser).to.eq(800n);  // 1000 - 200
    expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await providerKarura.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  it('when should not route', async () => {
    const routeArgs = {
      dest,
      destParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    try {
      await relayAndRoute({
        ...routeArgs,

        // bridge 0.000001 USDC
        signedVAA: '010000000001004ba23fa55bcb370773bdba954523ea305f96f814f51ce259fb327b57d985eec86a0f69bf46c4bb444d09b1d70e3b2aaa434639ec3ae93f5d0671b3e38055cf3501648726ae4d36000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a0900000000000012580f01000000000000000000000000000000000000000000000000000000000000000100000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00020000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'token amount too small to relay', 500);
    }

    try {
      await relayAndRoute({
        ...routeArgs,

        // bridge 10 TKN
        signedVAA: '01000000000100689102e0be499c096acd1ac49a34216a32f8c19f1b053e0ff47e0a994ea302b50261b4c1feab4ae933fa8de83bd86efde12cc3b82da00b9b8ccc2d502e145ad2006487368e8f3a010000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000125c0f01000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000009c8bcccdb17545658c6b84591567c6ed9b4d55bb000b0000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'unsupported token', 500);
    }
  });
});

describe('/relayAndRouteBatch', () => {
  const api = new ApiPromise({ provider: new WsProvider(BASILISK_TESTNET_NODE_URL) });
  const usdc = ERC20__factory.connect(KARURA_USDC_ADDRESS, providerKarura);

  beforeAll(async () => { await api.isReady; });
  afterAll(async () => { await api.disconnect(); });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      destParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    const curBalUser = await getBasiliskUsdcBalance(api, destAddr);
    const curBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    const { routerAddr } = (await shouldRouteXcm(routeArgs)).data;
    console.log({ routerAddr });

    const signedVAA = await transferFromFujiToKaruraTestnet('0.001', FUJI_TOKEN.USDC, routerAddr);
    console.log({ signedVAA });

    const relayAndRouteArgs = {
      ...routeArgs,
      signedVAA,
    };

    const res = await relayAndRouteBatch(relayAndRouteArgs);
    console.log(`batch relay and route finished! txHash: ${res.data}`);

    console.log('waiting for token to arrive at basilisk ...');
    await sleep(25000);

    const afterBalUser = await getBasiliskUsdcBalance(api, destAddr);
    const afterBalRelayer = (await usdc.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalUser, afterBalRelayer });

    // expect(afterBalRelayer - curBalRelayer).to.eq(200n);
    expect(afterBalUser - curBalUser).to.eq(800n);  // 1000 - 200
    expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await providerKarura.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  it('when should not route', async () => {
    const routeArgs = {
      dest,
      destParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    try {
      await relayAndRouteBatch({
        ...routeArgs,

        // bridge 0.000001 USDC
        signedVAA: '010000000001004ba23fa55bcb370773bdba954523ea305f96f814f51ce259fb327b57d985eec86a0f69bf46c4bb444d09b1d70e3b2aaa434639ec3ae93f5d0671b3e38055cf3501648726ae4d36000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a0900000000000012580f01000000000000000000000000000000000000000000000000000000000000000100000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00020000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRouteBatch did not throw when it should!');
    } catch (err) {
      expectError(err, 'token amount too small to relay', 500);
    }

    try {
      await relayAndRouteBatch({
        ...routeArgs,

        // bridge 10 TKN
        signedVAA: '01000000000100689102e0be499c096acd1ac49a34216a32f8c19f1b053e0ff47e0a994ea302b50261b4c1feab4ae933fa8de83bd86efde12cc3b82da00b9b8ccc2d502e145ad2006487368e8f3a010000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000125c0f01000000000000000000000000000000000000000000000000000000003b9aca000000000000000000000000009c8bcccdb17545658c6b84591567c6ed9b4d55bb000b0000000000000000000000008341cd8b7bd360461fe3ce01422fe3e24628262f000b0000000000000000000000000000000000000000000000000000000000000000',
      });

      expect.fail('relayAndRouteBatch did not throw when it should!');
    } catch (err) {
      expectError(err, 'unsupported token', 500);
    }
  });
});

describe('/routeWormhole', () => {
  const usdcK = ERC20__factory.connect(KARURA_USDC_ADDRESS, providerKarura);
  const usdcF = ERC20__factory.connect(FUJI_TOKEN.USDC, new JsonRpcProvider(ETH_RPC.FUJI));

  it('when should route', async () => {
    const routeArgs = {
      targetChainId: String(CHAIN_ID_AVAX),
      destAddr: TEST_ADDR_USER,
      fromParaId: PARA_ID.BASILISK,
      originAddr: GOERLI_USDC,
    };

    const res = await shouldRouteWormhole(routeArgs);
    const { routerAddr } = res.data;

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, relayerSigner);

    const curBalUser = (await usdcF.balanceOf(TEST_ADDR_USER)).toBigInt();
    const curBalRelayer = (await usdcK.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeWormhole(routeArgs);
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    // router should be destroyed
    expect((await usdcK.balanceOf(routerAddr)).toBigInt()).to.eq(0n);
    const routerCode = await providerKarura.getCode(routerAddr);
    expect(routerCode).to.eq('0x');

    /*  ---------- should be able to redeem from eth ----------  */
    const depositReceipt = await providerKarura.getTransactionReceipt(txHash);
    const sequence = parseSequenceFromLogEth(depositReceipt as ContractReceipt, CONTRACTS.TESTNET.karura.core);
    console.log('route to wormhole complete', { sequence }, 'waiting for VAA...');

    const signedVAA = await getSignedVAAFromSequence(
      sequence,
      CHAIN_ID_KARURA,
      CONTRACTS.TESTNET.karura.token_bridge,
    );
    console.log({ signedVAA });

    const providerFuji = new JsonRpcProvider(ETH_RPC.FUJI);
    const relayerSignerFuji = new Wallet(TEST_KEY.USER, providerFuji);
    const receipt = await redeemOnEth(
      CONTRACTS.TESTNET.avalanche.token_bridge,
      relayerSignerFuji,
      hexToUint8Array(signedVAA),
    );
    console.log(`redeem finished! txHash: ${receipt.transactionHash}`);

    const afterBalUser = (await usdcF.balanceOf(TEST_ADDR_USER)).toBigInt();
    const afterBalRelayer = (await usdcK.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalUser, afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(200n);
    expect(afterBalUser - curBalUser).to.eq(800n);  // 1000 - 200
  });

  // describe.skip('when should not route', () => {})
});

