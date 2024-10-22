import { ADDRESSES, ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { Wallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { parseEther, parseUnits } from 'ethers/lib/utils';
import { toHuman } from '@acala-network/asset-router/dist/utils';

import { DropAndBootstrapParams } from '../utils';
import { ETH_RPC, EUPHRATES_ADDR } from '../consts';
import {
  JITOSOL_LDOT_LP_PREDEPLOY_CODE,
  NEW_DEX_CODE,
  TEST_ADDR_RELAYER,
  TEST_ADDR_USER,
  TEST_KEY,
} from './testConsts';
import {
  api,
  expectError,
  sudoSendAndWait,
  sudoTransferToken,
  transferToken,
} from './testUtils';

const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
const relayer = new Wallet(TEST_KEY.RELAYER, provider);
const user = Wallet.createRandom().connect(provider);

const JITOSOL_DECIMALS = 9;
const LDOT_DECIMALS = 10;
const JITOSOL_ADDR = ROUTER_TOKEN_INFO.jitosol.acalaAddr;

const recipient = user.address;
const boostrapAmountJitosol = '0.1';
const boostrapAmountLdot = '10';

describe('prepare', () => {
  it('open bootstrap', async () => {
    const api = await ApiPromise.create({
      provider: new WsProvider('ws://localhost:8000'),
    });

    console.log('register jitosol ...');
    let tx = api.tx.assetRegistry.registerErc20Asset(JITOSOL_ADDR, 10000);
    await sudoSendAndWait(api, tx);

    console.log('set new dex code ...');
    tx = api.tx.evm.setCode('0x0000000000000000000000000000000000000803', NEW_DEX_CODE);
    await sudoSendAndWait(api, tx);
    expect(await provider.getCode('0x0000000000000000000000000000000000000803')).to.not.eq('0x');

    console.log('deploy LDOT-jitoSOL LP token predeploy ...');
    tx = api.tx.evm.createPredeployContract('0x00000000000000000002000000000301a7fb0045', JITOSOL_LDOT_LP_PREDEPLOY_CODE, 0, 1500000, 20000, []);
    await sudoSendAndWait(api, tx);
    expect(await provider.getCode('0x00000000000000000002000000000301a7fb0045')).to.not.eq('0x');

    console.log('open euphrates pool ...');
    const evmTx = api.tx.evm.call(EUPHRATES_ADDR, '0xd914cd4b00000000000000000000000000000000000000000002000000000301a7fb0045', 0, 1000000, 100000, []);
    tx = api.tx.utility.dispatchAs({
      system: {
        Signed: '23j4ay2zBSgaSs18xstipmHBNi39W2Su9n8G89kWrz8eCe8F',
      },
    }, evmTx);
    await sudoSendAndWait(api, tx);

    console.log('list provisioning ...');
    tx = api.tx.dex.listProvisioning(
      { Token: 'LDOT' },
      { Erc20: JITOSOL_ADDR },
      1,
      1,
      parseUnits('10', 10).toBigInt(),
      parseUnits('10', 9).toBigInt(),
      0,
    );
    await sudoSendAndWait(api, tx);

    console.log('minting some jitosol for relayer ...');
    await sudoTransferToken(
      '0x335B26d05DacA31d6d921F07466e19eF8650D4Bf',
      TEST_ADDR_RELAYER,
      provider,
      JITOSOL_ADDR,
      5,
    );
  });
});


describe.concurrent('/shouldRouteDropAndBootstrap', () => {
  const testShouldRouteDropAndBootstrap = async (
    params: DropAndBootstrapParams,
    snapshotName: string,
  ) => {
    let res = await api.shouldRouteDropAndBootstrap(params);
    expect(res).toMatchSnapshot(`${snapshotName}_original`);

    // should be case insensitive
    res = await api.shouldRouteDropAndBootstrap(params);
    expect(res).toMatchSnapshot(`${snapshotName}_lowercase`);
  };

  it('when should route', async () => {
    await testShouldRouteDropAndBootstrap({
      recipient: TEST_ADDR_USER,
      gasDrop: true,
      feeToken: 'jitosol',
    }, 'jitosol_gasDrop_true');

    await testShouldRouteDropAndBootstrap({
      recipient: TEST_ADDR_USER,
      gasDrop: false,
      feeToken: 'jitosol',
    }, 'jitosol_gasDrop_false');

    await testShouldRouteDropAndBootstrap({
      recipient: TEST_ADDR_USER,
      gasDrop: false,
      feeToken: 'ldot',
    }, 'ldot_gasDrop_false');
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await api.shouldRouteDropAndBootstrap({
          recipient,
          gasDrop: false,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['feeToken is a required field'], 400);
      }

      try {
        await api.shouldRouteDropAndBootstrap({
          recipient,
          feeToken: 'jitosol',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['gasDrop is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      try {
        await api.shouldRouteDropAndBootstrap({
          recipient,
          gasDrop: false,
          feeToken: 'xxx',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['feeToken must be one of { jitosol, ldot }'], 400);
      }

      try {
        await api.shouldRouteDropAndBootstrap({
          recipient,
          gasDrop: true,
          feeToken: 'ldot',
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['does not support gasDrop when feeToken is ldot'], 400);
      }
    });
  });
});

describe('/routeDropAndBootstrap', () => {
  let routerAddr: string;
  const jitosol = ERC20__factory.connect(JITOSOL_ADDR, relayer);
  const ldot = ERC20__factory.connect(LDOT, relayer);

  const fetchTokenBalances = async () => {
    if (!routerAddr) throw new Error('routerAddr not set');

    const [
      userBal,
      userBalJitosol,
      relayerBalJitosol,
      routerBalJitosol,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    ] = await Promise.all([
      provider.getBalance(recipient),
      jitosol.balanceOf(recipient),
      jitosol.balanceOf(TEST_ADDR_RELAYER),
      jitosol.balanceOf(routerAddr),
      ldot.balanceOf(recipient),
      ldot.balanceOf(TEST_ADDR_RELAYER),
      ldot.balanceOf(routerAddr),
    ]);

    console.log({
      userBal: toHuman(userBal, 18),
      userBalJitosol: toHuman(userBalJitosol, JITOSOL_DECIMALS),
      relayerBalJitosol: toHuman(relayerBalJitosol, JITOSOL_DECIMALS),
      routerBalJitosol: toHuman(routerBalJitosol, JITOSOL_DECIMALS),
      userBalLdot: toHuman(userBalLdot, LDOT_DECIMALS),
      relayerBalLdot: toHuman(relayerBalLdot, LDOT_DECIMALS),
      routerBalLdot: toHuman(routerBalLdot, LDOT_DECIMALS),
    });

    return {
      userBal,
      userBalJitosol,
      relayerBalJitosol,
      routerBalJitosol,
      userBalLdot,
      relayerBalLdot,
      routerBalLdot,
    };
  };

  it('works with jitosol as fee token and gas drop', async () => {
    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      gasDrop: true,
      feeToken: 'jitosol',
    };

    const shouldRouteRes = await api.shouldRouteDropAndBootstrap(routeArgs);
    ({ routerAddr } = shouldRouteRes.data);
    console.log({ routerAddr });

    // make sure user has enough token and ACA to transfer to router
    console.log('refilling ACA for user ...');
    await (await relayer.sendTransaction({
      to: recipient,
      value: parseEther('3'),
    })).wait();

    const bal = await fetchTokenBalances();
    const refillAmount = parseUnits(boostrapAmountJitosol, JITOSOL_DECIMALS);
    if (bal.userBalJitosol.lt(refillAmount.mul(2))) {
      if (bal.relayerBalJitosol.lt(refillAmount.mul(2))) {
        throw new Error('both relayer and user do not have enough jitosol to transfer to router!');
      }

      console.log('refilling token for user ...');
      await (await jitosol.transfer(recipient, refillAmount.mul(2))).wait();
    }

    console.log('transferring token to router ...');
    await transferToken(routerAddr, user, JITOSOL_ADDR, Number(boostrapAmountJitosol));

    const bal0 = await fetchTokenBalances();

    console.log('routing ...');
    let routeRes = await api.routeDropAndBootstrap(routeArgs);
    let txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances();

    // router should NOT be destroyed
    let routerCode = await provider.getCode(routerAddr);
    expect(routerCode.length).to.be.greaterThan(100);
    expect(bal1.routerBalJitosol.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // relayer should receive jitosol fee
    const routingFee = await FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider)
      .getFee(JITOSOL_ADDR);

    // first route should perform swap + ACA drop
    const swapFee = parseUnits('0.0035', 9);
    expect(bal1.relayerBalJitosol.sub(bal0.relayerBalJitosol).toBigInt())
      .to.eq(routingFee.add(swapFee).toBigInt());
    expect(bal1.relayerBalLdot.sub(bal0.relayerBalLdot).toBigInt()).to.eq(0n);

    // user should receive 3 ACA drop
    expect(bal1.userBal.sub(bal0.userBal).toBigInt()).to.eq(parseEther('3').toBigInt());

    console.log('------------------------------------ route 2 ------------------------------------');
    console.log('transferring token to router ...');
    await transferToken(routerAddr, user, JITOSOL_ADDR, Number(boostrapAmountJitosol));

    const bal2 = await fetchTokenBalances();

    console.log('routing ...');
    routeRes = await api.routeDropAndBootstrap(routeArgs);
    txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal3 = await fetchTokenBalances();

    // router should NOT be destroyed
    routerCode = await provider.getCode(routerAddr);
    expect(routerCode.length).to.be.greaterThan(100);
    expect(bal3.routerBalJitosol.toNumber()).to.eq(0);
    expect(bal3.routerBalLdot.toNumber()).to.eq(0);

    // second route should only route
    expect(bal3.relayerBalJitosol.sub(bal2.relayerBalJitosol).toBigInt()).to.eq(routingFee.toBigInt());
    expect(bal3.relayerBalLdot.sub(bal2.relayerBalLdot).toBigInt()).to.eq(0n);

    // user should NOT receive 3 ACA drop
    expect(bal3.userBal.sub(bal2.userBal).toBigInt()).to.eq(0n);
  });

  it('works with jitosol as fee token and no gas drop', async () => {
    const relayerBal = await relayer.getBalance();
    expect(relayerBal.gt(parseEther('10'))).to.be.true;

    const routeArgs = {
      recipient: user.address,
      gasDrop: false,
      feeToken: 'jitosol',
    };

    const shouldRouteRes = await api.shouldRouteDropAndBootstrap(routeArgs);
    ({ routerAddr } = shouldRouteRes.data);
    console.log({ routerAddr });

    // make sure user has enough token and ACA to transfer to router
    console.log('refilling ACA for user ...');
    await (await relayer.sendTransaction({
      to: recipient,
      value: parseEther('3'),
    })).wait();

    const bal = await fetchTokenBalances();
    const refillAmount = parseUnits(boostrapAmountJitosol, JITOSOL_DECIMALS);
    if (bal.userBalJitosol.lt(refillAmount.mul(2))) {
      if (bal.relayerBalJitosol.lt(refillAmount.mul(2))) {
        throw new Error('both relayer and user do not have enough jitosol to transfer to router!');
      }

      console.log('refilling token for user ...');
      await (await jitosol.transfer(recipient, refillAmount.mul(2))).wait();
    }

    console.log('transferring token to router ...');
    await transferToken(routerAddr, user, JITOSOL_ADDR, Number(boostrapAmountJitosol));

    const bal0 = await fetchTokenBalances();

    console.log('routing ...');
    let routeRes = await api.routeDropAndBootstrap(routeArgs);
    let txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal1 = await fetchTokenBalances();

    // router should NOT be destroyed
    let routerCode = await provider.getCode(routerAddr);
    expect(routerCode.length).to.be.greaterThan(100);
    expect(bal1.routerBalJitosol.toNumber()).to.eq(0);
    expect(bal1.routerBalLdot.toNumber()).to.eq(0);

    // relayer should receive jitosol fee but no swap fee
    const routingFee = await FeeRegistry__factory.connect(ADDRESSES.ACALA.feeAddr, provider)
      .getFee(JITOSOL_ADDR);
    expect(bal1.relayerBalJitosol.sub(bal0.relayerBalJitosol).toBigInt()).to.eq(routingFee.toBigInt());
    expect(bal1.relayerBalLdot.sub(bal0.relayerBalLdot).toBigInt()).to.eq(0n);

    // user should NOT receive 3 ACA drop
    expect(bal1.userBal.sub(bal0.userBal).toBigInt()).to.eq(0n);

    console.log('------------------------------------ route 2 ------------------------------------');
    console.log('transferring token to router ...');
    await transferToken(routerAddr, user, JITOSOL_ADDR, Number(boostrapAmountJitosol));

    const bal2 = await fetchTokenBalances();

    console.log('routing ...');
    routeRes = await api.routeDropAndBootstrap(routeArgs);
    txHash = routeRes.data;
    console.log(`route finished! txHash: ${txHash}`);

    const bal3 = await fetchTokenBalances();

    // router should NOT be destroyed
    routerCode = await provider.getCode(routerAddr);
    expect(routerCode.length).to.be.greaterThan(100);
    expect(bal3.routerBalJitosol.toNumber()).to.eq(0);
    expect(bal3.routerBalLdot.toNumber()).to.eq(0);

    // second route should be the same as the first one
    expect(bal3.relayerBalJitosol.sub(bal2.relayerBalJitosol).toBigInt()).to.eq(routingFee.toBigInt());
    expect(bal3.relayerBalLdot.sub(bal2.relayerBalLdot).toBigInt()).to.eq(0n);

    // user should NOT receive 3 ACA drop
    expect(bal3.userBal.sub(bal2.userBal).toBigInt()).to.eq(0n);
  });
});
