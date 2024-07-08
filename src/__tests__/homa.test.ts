import { ADDRESSES } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { DOT, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { EVMAccounts__factory, IHoma__factory } from '@acala-network/contracts/typechain';
import { EVM_ACCOUNTS, HOMA } from '@acala-network/contracts/utils/Predeploy';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ONE_ACA, almostEq, toHuman } from '@acala-network/asset-router/dist/utils';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import assert from 'assert';

import { ETH_RPC, SECOND } from '../consts';
import { Mainnet } from '../utils';
import { RouteStatus } from '../api';
import {
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  expectError,
  mockXcmToRouter,
  routeHoma,
  routeHomaAuto,
  routeStatus,
  shouldRouteHoma,
} from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);
const user = new Wallet(TEST_KEY.USER, provider);

describe.concurrent('/shouldRouteHoma', () => {
  const destAddr = '0x75E480dB528101a381Ce68544611C169Ad7EB342';
  const destAddrSubstrate = '23AdbsfRysaabyrWS2doCFsKisvt7dGbS3wQFXRS6pNbQY8G';

  describe('when should route', async () => {
    it('to evm address', async () => {
      // for (const network of [Object.values(Mainnet)]) {    // TODO: enable this after deploying contract to karura
      for (const chain of ['acala']) {
        let res = await shouldRouteHoma({
          destAddr,
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
          {
            "data": {
              "routerAddr": "0x8A4f03B2D615172f0714AaC2E8C399a6f0d9e448",
              "shouldRoute": true,
            },
          }
        `);

        // should be case insensitive
        res = await shouldRouteHoma({
          destAddr: destAddr.toLocaleLowerCase(),
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
          {
            "data": {
              "routerAddr": "0x8A4f03B2D615172f0714AaC2E8C399a6f0d9e448",
              "shouldRoute": true,
            },
          }
        `);
      }
    });

    it('to substrate address', async () => {
      // for (const network of [Object.values(Mainnet)]) {    // TODO: enable this after deploying contract to karura
      for (const chain of ['acala']) {
        const res = await shouldRouteHoma({
          destAddr: destAddrSubstrate,
          chain,
        });

        expect(res).toMatchInlineSnapshot(`
          {
            "data": {
              "routerAddr": "0x1140EFc2C45e9307701DA521884F75dDDe28f28f",
              "shouldRoute": true,
            },
          }
        `);
      }
    });
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteHoma({
          destAddr,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['chain is a required field'], 400);
      }

      try {
        await shouldRouteHoma({
          chain: Mainnet.Acala,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['destAddr is a required field'], 400);
      }

      try {
        await shouldRouteHoma({
          chain: 'mandala',
          destAddr,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['chain must be one of the following values: acala, karura'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await shouldRouteHoma({
        chain: Mainnet.Acala,
        destAddr: '0xaaaaaaaaaa',
      });
      expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "msg": "address 0xaaaaaaaaaa is not a valid evm or substrate address",
            "shouldRoute": false,
          },
        }
      `);
    });
  });
});

describe('/routeHoma', () => {
  const DOT_DECIMALS = 10;
  const dot = ERC20__factory.connect(DOT, provider);
  const ldot = ERC20__factory.connect(LDOT, provider);
  const homa = IHoma__factory.connect(HOMA, provider);
  const evmAccounts = EVMAccounts__factory.connect(EVM_ACCOUNTS, provider);
  const fee = FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider);
  const stakeAmount = 6;
  const parsedStakeAmount = parseUnits(String(stakeAmount), DOT_DECIMALS);
  let routerAddr: string;

  const fetchTokenBalances = async () => {
    if (!routerAddr) throw new Error('routerAddr not set');

    const [
      userBalDot,
      relayerBalDot,
      routerBalDot,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    ] = await Promise.all([
      dot.balanceOf(TEST_ADDR_USER),
      dot.balanceOf(TEST_ADDR_RELAYER),
      dot.balanceOf(routerAddr),
      ldot.balanceOf(TEST_ADDR_USER),
      ldot.balanceOf(TEST_ADDR_RELAYER),
      ldot.balanceOf(routerAddr),
    ]);

    console.log({
      userBalDot: toHuman(userBalDot, DOT_DECIMALS),
      relayerBalDot: toHuman(relayerBalDot, DOT_DECIMALS),
      routerBalDot: toHuman(routerBalDot, DOT_DECIMALS),
      userBalLdot: toHuman(userBalLdot, DOT_DECIMALS),
      relayerBalLdot: toHuman(relayerBalLdot, DOT_DECIMALS),
      routerBalLdot: toHuman(routerBalLdot, DOT_DECIMALS),
    });

    return {
      userBalDot,
      relayerBalDot,
      routerBalDot,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    };
  };

  const testHomaRouter = async (destAddr: string) => {
    const relayerBal = await relayer.getBalance();
    assert(relayerBal.gt(parseEther('10')), `relayer doesn't have enough balance to relay! ${relayer.address}`);

    const routeArgs = {
      destAddr,
      chain: 'acala',
    };
    const res = await shouldRouteHoma(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough DOT to transfer to router
    const bal = await fetchTokenBalances();
    if (bal.userBalDot.lt(parsedStakeAmount)) {
      if (bal.relayerBalDot.lt(parsedStakeAmount)) {
        throw new Error('both relayer and user do not have enough DOT to transfer to router!');
      }

      console.log('refilling dot for user ...');
      await (await dot.connect(relayer).transfer(TEST_ADDR_USER, parsedStakeAmount)).wait();
    }

    const bal0 = await fetchTokenBalances();

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, user, DOT, stakeAmount);

    console.log('routing ...');
    const routeRes = await routeHoma({
      ...routeArgs,
      token: DOT,
    });
    const txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerBalDot.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // user should receive LDOT
    const routingFee = await fee.getFee(DOT);
    const exchangeRate = await homa.getExchangeRate();   // 10{18} LDOT => ? DOT
    const expectedLdot = parsedStakeAmount.sub(routingFee).mul(ONE_ACA).div(exchangeRate);
    const ldotReceived = bal1.userBalLdot.sub(bal0.userBalLdot);

    expect(almostEq(expectedLdot, ldotReceived)).to.be.true;
    expect(bal0.userBalDot.sub(bal1.userBalDot).toBigInt()).to.eq(parsedStakeAmount.toBigInt());

    // relayer should receive DOT fee
    expect(bal1.relayerBalDot.sub(bal0.relayerBalDot).toBigInt()).to.eq(routingFee.toBigInt());
  };

  const testAutoHomaRouter = async (destAddr: string) => {
    const relayerBal = await relayer.getBalance();
    assert(relayerBal.gt(parseEther('10')), `relayer doesn't have enough balance to relay! ${relayer.address}`);

    const routeArgs = {
      destAddr,
      chain: 'acala',
    };
    const res = await shouldRouteHoma(routeArgs);
    ({ routerAddr } = res.data);

    // make sure user has enough DOT to transfer to router
    const bal = await fetchTokenBalances();
    if (bal.userBalDot.lt(parsedStakeAmount)) {
      if (bal.relayerBalDot.lt(parsedStakeAmount)) {
        throw new Error('both relayer and user do not have enough DOT to transfer to router!');
      }

      console.log('refilling dot for user ...');
      await (await dot.connect(relayer).transfer(TEST_ADDR_USER, parsedStakeAmount)).wait();
    }

    const bal0 = await fetchTokenBalances();

    console.log('sending auto routing request ...');
    const routeRes = await routeHomaAuto({
      ...routeArgs,
      token: DOT,
    });
    const reqId = routeRes.data;
    console.log(`auto route submitted! reqId: ${reqId}`);

    const waitForRoute = new Promise<void>((resolve, reject) => {
      const pollRouteStatus = setInterval(async () => {
        const res = await routeStatus({ id: reqId });
        const { status } = res.data[0];
        console.log(`current status: ${status}`);

        if (status === RouteStatus.Complete) {
          resolve();
          clearInterval(pollRouteStatus);
        }
      }, 1 * SECOND);

      setTimeout(reject, 100 * SECOND);
    });

    console.log('xcming to router ...');
    await mockXcmToRouter(routerAddr, user, DOT, stakeAmount);

    console.log('waiting for auto routing ...');
    await waitForRoute;

    // query status by destAddr should also returns same result
    const { data } = await routeStatus({ destAddr });
    const reqInfo = data.find(info => info.reqId === reqId);
    expect(reqInfo).not.to.be.undefined;
    expect(reqInfo.status).to.eq(RouteStatus.Complete);

    console.log('route complete!');
    const bal1 = await fetchTokenBalances();

    // router should be destroyed
    const routerCode = await provider.getCode(routerAddr);
    expect(routerCode).to.eq('0x');
    expect(bal1.routerBalDot.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // user should receive LDOT
    const routingFee = await fee.getFee(DOT);
    const exchangeRate = await homa.getExchangeRate();   // 10{18} LDOT => ? DOT
    const expectedLdot = parsedStakeAmount.sub(routingFee).mul(ONE_ACA).div(exchangeRate);
    const ldotReceived = bal1.userBalLdot.sub(bal0.userBalLdot);

    expect(almostEq(expectedLdot, ldotReceived)).to.be.true;
    expect(bal0.userBalDot.sub(bal1.userBalDot).toBigInt()).to.eq(parsedStakeAmount.toBigInt());

    // relayer should receive DOT fee
    expect(bal1.relayerBalDot.sub(bal0.relayerBalDot).toBigInt()).to.eq(routingFee.toBigInt());
  };

  it('route to evm address', async () => {
    await testHomaRouter(TEST_ADDR_USER);
  });

  it('route to substrate address', async () => {
    const ACALA_SS58_PREFIX = 10;
    const userAccountId = await evmAccounts.getAccountId(TEST_ADDR_USER);
    const userSubstrateAddr = encodeAddress(userAccountId, ACALA_SS58_PREFIX);

    await testHomaRouter(userSubstrateAddr);
  });

  it('auto route to evm address', async () => {
    await testAutoHomaRouter(TEST_ADDR_USER);
  });

  it('auto route to substrate address', async () => {
    const ACALA_SS58_PREFIX = 10;
    const userAccountId = await evmAccounts.getAccountId(TEST_ADDR_USER);
    const userSubstrateAddr = encodeAddress(userAccountId, ACALA_SS58_PREFIX);

    await testAutoHomaRouter(userSubstrateAddr);
  });
});
