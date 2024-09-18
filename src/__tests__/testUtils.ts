import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { expect } from 'vitest';
import { parseUnits } from 'ethers/lib/utils';
import axios from 'axios';

import { RELAYER_URL } from '../consts';

const keyring = new Keyring({ type: 'sr25519' });
const alice = keyring.addFromUri('//Alice');

export const sudoTransferToken = async (
  fromAddr: string,
  toAddr: string,
  provider: JsonRpcProvider,
  tokenAddr: string,
  humanAmount: number,
) => {
  const token = ERC20__factory.connect(tokenAddr, provider);

  const [decimals, routerBal, symbol] = await Promise.all([
    token.decimals(),
    token.balanceOf(toAddr),
    token.symbol(),
  ]);
  const amount = parseUnits(String(humanAmount), decimals);

  if (routerBal.gt(0)) {
    expect(routerBal.toBigInt()).to.eq(amount.toBigInt());
  } else {
    console.log(`sudo transferring ${humanAmount} ${symbol} from ${fromAddr} to ${toAddr} ...`);
    const fromTokenBal = await token.balanceOf(fromAddr);
    if (fromTokenBal.lt(amount)) {
      throw new Error(`fromAddr ${fromAddr} has no enough token [${tokenAddr}] to transfer! ${fromTokenBal.toBigInt()} < ${amount.toBigInt()}`);
    }

    const { data } = await token.populateTransaction.transfer(toAddr, amount);
    const api = await ApiPromise.create({
      provider: new WsProvider('ws://localhost:8000'),
    });

    const tx = api.tx.evm.call(tokenAddr, data!, 0, 1000000, 64, []);
    const extrinsic = api.tx.sudo.sudoAs(fromAddr, tx);
    const hash = await extrinsic.signAndSend(alice);

    const receipt = await provider.waitForTransaction(hash.toHex());
    expect(receipt.status).to.eq(1);

    await api.disconnect();
  }
};

export const transferToken = async (
  toAddr: string,
  signer: Wallet,
  tokenAddr: string,
  amount: number,
) => {
  const token = ERC20__factory.connect(tokenAddr, signer);

  const decimals = await token.decimals();
  const routeAmount = parseUnits(String(amount), decimals);

  const routerBal = await token.balanceOf(toAddr);
  if (routerBal.gt(0)) {
    expect(routerBal.toBigInt()).to.eq(routeAmount.toBigInt());
  } else {
    const fromTokenBal = await token.balanceOf(signer.address);
    if (fromTokenBal.lt(routeAmount)) {
      throw new Error(`signer ${signer.address} has no enough token [${tokenAddr}] to transfer! ${fromTokenBal.toBigInt()} < ${routeAmount.toBigInt()}`);
    }
    await (await token.transfer(toAddr, routeAmount)).wait();
  }
};

export const expectError = (err: any, msg: any, code: number) => {
  if (axios.isAxiosError(err)) {
    expect(err.response?.status).to.equal(code);
    expect(err.response?.data.error).to.deep.equal(msg);
  } else {
    throw new Error('not an axios error');
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

const _axiosGet = (url: string) => async (params: any) => {
  const res = await axios.get(url, { params });
  return res.data;
};

const _axiosPost = (url: string) => async (params: any) => {
  const res = await axios.post(url, { ...params });
  return res.data;
};

export const api = {
  shouldRouteXcm: _axiosGet(RELAYER_URL.SHOULD_ROUTE_XCM),
  shouldRouteWormhole: _axiosGet(RELAYER_URL.SHOULD_ROUTE_WORMHOLE),
  shouldRelay: _axiosGet(RELAYER_URL.SHOULD_RELAY),
  relay: _axiosPost(RELAYER_URL.RELAY),
  routeXcm: _axiosPost(RELAYER_URL.ROUTE_XCM),
  relayAndRoute: _axiosPost(RELAYER_URL.RELAY_AND_ROUTE),
  relayAndRouteBatch: _axiosPost(RELAYER_URL.RELAY_AND_ROUTE_BATCH),
  routeWormhole: _axiosPost(RELAYER_URL.ROUTE_WORMHOLE),
  noRoute: _axiosPost(RELAYER_URL.NO_ROUTE),
  version: _axiosGet(RELAYER_URL.VERSION),
  testTimeout: _axiosPost(RELAYER_URL.TEST_TIMEOUT),
  health: _axiosGet(RELAYER_URL.HEALTH),
  shouldRouteHoma: _axiosGet(RELAYER_URL.SHOULD_ROUTER_HOMA),
  routeHoma: _axiosPost(RELAYER_URL.ROUTE_HOMA),
  routeHomaAuto: _axiosPost(RELAYER_URL.ROUTE_HOMA_AUTO),
  routeStatus: _axiosGet(RELAYER_URL.ROUTE_STATUS),
  shouldRouteEuphrates: _axiosGet(RELAYER_URL.SHOULD_ROUTER_EUPHRATES),
  routeEuphrates: _axiosPost(RELAYER_URL.ROUTE_EUPHRATES),
};
