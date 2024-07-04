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
  VAA_RANDOM_TOKEN_BSC_TO_ACALA,
  VAA_TINY_AMOUNT_DAI_BSC_TO_ACALA,
  VAA_TRANSFER_10_USDC_ETH_TO_ACALA,
} from './vaa';
import {
  expectError,
  expectErrorData,
  getBasiliskUsdcBalance,
  mockXcmToRouter,
  relayAndRoute,
  relayAndRouteBatch,
  routeWormhole,
  routeXcm,
  shouldRouteWormhole,
  shouldRouteXcm,
  transferFromFujiToKaruraTestnet,
  transferToRouter,
} from './testUtils';
import { getSignedVAAFromSequence } from '../utils';

const DAI_ADDR = '0x54A37A01cD75B616D63E0ab665bFfdb0143c52AE';

const VAA_DAI_HYDRA = '01000000040d00d26a66904e780a5cff85cbc9b9b432eab98cafd7e44d49f1d1bbc36ee086e4086b057bb99e007c79753c39c2b801d88f9a76d6924c3f3284f710f1923c1475bf00016ca27e5fc37e4d2cbd99534dcc8baa57f3a658b4a9c238b2fae100510df897db37ab7166ea5ca0d6925cc908b9e487810f36faf84eb3f43f3c2f9297bc9572c201029a05af272025bad76145d52a5bc32b6ad06551fafa5b805aad0cfa7bcb8d0c6219524d2a10c71ba1393d1f94d9e0672c0b5090ffe225599dfff506c7753a4e870004545063222a09374c174cff07e92aa1823867b9bf59815f929cd8d67aa92dad1a6ddcf78ac9116ce4ae6f0f9d96c3940aa12b028234994e985c8dd8f4db9fd8c9010740fdef738b7fae5f6c5eb90a090dd27bcec1ae9652a14fa2d899bdc1b39563c35785976f12941d51a26adb7eaf64441319634e7bdb4ca5d434e31bc0bf8d3b8701097380e1a231bb02eec28a57fb03cd3a7ecfd675fba64d5d7e1667545ad79011c32f4516739fb4364a4888f1b02de1473aeb241e84963a3a11d3f4f7b6bc49859e010a1f124ecae48acef864556f60ccec8a0549545499ec33b22c3ec30054a1537e04142bc80877b75252d5d67598d18f88c13a7f2e7744d2e75259d0945bbc9c7288000d83817da0a40da3f2939f1d06c531179f7b5f4163180dbd6b3dbee84e44d261f02f07518c5c060af6a88d6efae78bd6f35578cbb7cea81c3d177485c84569f8ec010eaf4f1c3e672d98464eb8a05e13b61426b6c537d3321a7dc7065f5abb8c865cf16bcdd5eb20ea37fa2b4faeaf6feba147b7a213f04370dddd7ab46781bfda1f7c010f731a74b4cc9113741ece7d943619a2cd1b8b2a441a053e098f1344cc7d0028527bd096329da0be902724aa6f4d190a76ac90903d6e822364eaf174de5c2d102a011075156ae84288550bef7d96b929cda6244a14bee24daa2f8eda186375b3fc981d12a23c14f24151160d81f938c52929f66dd9402bca16b8316c84b4bdfc7a3a9100115f101d86b7dc0fa0e4b4a41097ce9369732706c87cd885416e39417f94e87caa71880572c11b1809bdbc5a44746256ef538bf55caeb9a58f18876aa1064f668e0012d30a833350b5408ccd9ede536b6e2a71e985d753583accc2f41f759e88496aed0934ddd8527e0c361871c134b7269534e5e24c9772e1f3b1c3f6d8a18c23b1dc01668646cb2982010000020000000000000000000000003ee18b2214aff97000d974cf647e7c347e8fa585000000000004996b0101000000000000000000000000000000000000000000000000000000003c3360800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0002000000000000000000000000c5dd20ed342cefece9e013d7d1763c398e987f7d000c0000000000000000000000000000000000000000000000000000000000000000';

const routeArgs = {
  dest: '0x04010200c91f0100525756d2a8c2bb099f2ac22c669bb5a1e5eaf94f687f7b7c5779b288b05bed75',
  destParaId: '2034',     // hydra
  originAddr: '0x6b175474e89094c44da98b954eedeac495271d0f',  // DAI
};

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);

describe('/routeXcm', () => {
  it('when should route', async () => {
    const res = await shouldRouteXcm(routeArgs);
    const { routerAddr } = res.data;

    console.log('transferring to router ...');
    await transferToRouter(routerAddr, relayer);

    const dai = ERC20__factory.connect(DAI_ADDR, provider);
    const curBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeXcm(routeArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    const afterBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
    expect((await dai.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  // describe.skip('when should not route', () => {})
});

describe.only('/relayAndRoute', () => {
  it('when should route', async () => {
    const { routerAddr } = (await shouldRouteXcm(routeArgs)).data;
    console.log({ routerAddr });

    const relayAndRouteArgs = {
      ...routeArgs,
      signedVAA: VAA_DAI_HYDRA,
    };

    const dai = ERC20__factory.connect(DAI_ADDR, provider);
    const curBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalRelayer });

    const wormholeWithdrawFilter = dai.filters.Transfer(
      '0x0000000000000000000000000000000000000000',
      routerAddr,
    );
    dai.once(wormholeWithdrawFilter, (_from, _to, _value, event) => {
      console.log(`relay finished! txHash: ${event.transactionHash}`);
    });

    const res = await relayAndRoute(relayAndRouteArgs);
    console.log(`route finished! txHash: ${res.data}`);

    const afterBalRelayer = (await dai.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ afterBalRelayer });

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
    expect((await dai.balanceOf(routerAddr)).toBigInt()).to.eq(0n);

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
  });

  it('when should not route', async () => {
    try {
      await relayAndRoute({
        ...routeArgs,
        signedVAA: VAA_TINY_AMOUNT_DAI_BSC_TO_ACALA,    // bridge 0.000001 DAI
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'token amount too small to relay', 500);
    }

    try {
      await relayAndRoute({
        ...routeArgs,
        signedVAA: VAA_RANDOM_TOKEN_BSC_TO_ACALA,
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'unsupported token', 500);
    }

    try {
      await relayAndRouteBatch({
        ...routeArgs,
        signedVAA: VAA_TRANSFER_10_USDC_ETH_TO_ACALA + '12345',   // invalid VAA
      });

      expect.fail('relayAndRoute did not throw when it should!');
    } catch (err) {
      expectError(err, 'failed to estimate gas limit', 500);
      expectErrorData(err, errData => {
        expect(errData.params.err.reason).to.contain('VM signature invalid');
      });
    }
  });
});

// not in use
describe.skip('/relayAndRouteBatch', () => {});

describe('/routeWormhole', () => {
  const usdcK = ERC20__factory.connect(KARURA_USDC_ADDRESS, provider);
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
    await mockXcmToRouter(routerAddr, relayer);

    const curBalUser = (await usdcF.balanceOf(TEST_ADDR_USER)).toBigInt();
    const curBalRelayer = (await usdcK.balanceOf(TEST_ADDR_RELAYER)).toBigInt();
    console.log({ curBalUser, curBalRelayer });

    console.log('routing ...');
    const routeRes = await routeWormhole(routeArgs);
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    // router should be destroyed
    expect((await usdcK.balanceOf(routerAddr)).toBigInt()).to.eq(0n);
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');

    /*  ---------- should be able to redeem from eth ----------  */
    const depositReceipt = await provider.getTransactionReceipt(txHash);
    const sequence = parseSequenceFromLogEth(
      depositReceipt as ContractReceipt,
      CONTRACTS.TESTNET.karura.core,
    );
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

    expect(afterBalRelayer - curBalRelayer).to.eq(40000000000000000n);
    expect(afterBalUser - curBalUser).to.eq(800n);  // 1000 - 200
  });

  // describe.skip('when should not route', () => {})
});
