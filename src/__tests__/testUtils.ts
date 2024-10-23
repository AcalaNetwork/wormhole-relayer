import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { Wallet } from 'ethers';
import { expect } from 'vitest';
import { parseUnits } from 'ethers/lib/utils';
import axios from 'axios';

import { ETH_RPC, apiUrl } from '../consts';
import { TEST_KEY } from './testConsts';

const keyring = new Keyring({ type: 'sr25519' });
export const alice = keyring.addFromUri('//Alice');

export const provider = new AcalaJsonRpcProvider(ETH_RPC.LOCAL);
export const relayer = new Wallet(TEST_KEY.RELAYER, provider);   // 0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3
export const user = new Wallet(TEST_KEY.USER, provider);         // 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6

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

    const tx = api.tx.evm.call(tokenAddr, data!, 0, 1000000, 100000, []);
    const extrinsic = api.tx.sudo.sudoAs(fromAddr, tx);
    const hash = await extrinsic.signAndSend(alice);

    const receipt = await provider.waitForTransaction(hash.toHex(), 1, 30000);
    expect(receipt.status).to.eq(1);

    await api.disconnect();
  }
};

export const sudoSendAndWait = (
  api: ApiPromise,
  tx: SubmittableExtrinsic,
) => new Promise((resolve, reject) => {
  api.tx.sudo.sudo(tx).signAndSend(alice, ({ status, events }) => {
    if (status.isInBlock || status.isFinalized) {
      events.forEach(({ event }) => {
        const { data, method, section } = event;
        if (section === 'system' && method === 'ExtrinsicFailed') {
          reject(new Error(`Transaction failed: ${data.toString()}`));
        }
      });

      // FIXME: should not wait for 3s, chopsticks issue?
      setTimeout(() => {
        resolve(status.hash.toString());
      }, 3000);
    }
  }).catch(error => {
    reject(error);
  });
});

export const transferToken = async (
  toAddr: string,
  signer: Wallet,
  tokenAddr: string,
  humanAmount: number,
) => {
  const token = ERC20__factory.connect(tokenAddr, signer);

  const decimals = await token.decimals();
  const routeAmount = parseUnits(String(humanAmount), decimals);

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
    throw err;
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
  shouldRelay: _axiosGet(apiUrl.shouldRelay),
  relay: _axiosPost(apiUrl.relay),

  shouldRouteXcm: _axiosGet(apiUrl.shouldRouteXcm),
  routeXcm: _axiosPost(apiUrl.routeXcm),

  shouldRouteWormhole: _axiosGet(apiUrl.shouldRouteWormhole ),
  routeWormhole: _axiosPost(apiUrl.routeWormhole),
  relayAndRoute: _axiosPost(apiUrl.relayAndRoute),
  relayAndRouteBatch: _axiosPost(apiUrl.relayAndRouteBatch),

  shouldRouteHoma: _axiosGet(apiUrl.shouldRouteHoma),
  routeHoma: _axiosPost(apiUrl.routeHoma),
  routeHomaAuto: _axiosPost(apiUrl.routeHomaAuto),
  routeStatus: _axiosGet(apiUrl.routeStatus),

  shouldRouteEuphrates: _axiosGet(apiUrl.shouldRouteEuphrates),
  routeEuphrates: _axiosPost(apiUrl.routeEuphrates),

  shouldRouteDropAndBootstrap: _axiosGet(apiUrl.shouldRouteDropAndBootstrap),
  routeDropAndBootstrap: _axiosPost(apiUrl.routeDropAndBootstrap),

  shouldRouteSwapAndLp: _axiosGet(apiUrl.shouldRouteSwapAndLp),
  routeSwapAndLp: _axiosPost(apiUrl.routeSwapAndLp),
  rescueSwapAndLp: _axiosPost(apiUrl.rescueSwapAndLp),

  routerInfo: _axiosGet(apiUrl.routerInfo),
  saveRouterInfo: _axiosPost(apiUrl.saveRouterInfo),

  noRoute: _axiosPost(apiUrl.noRoute),
  version: _axiosGet(apiUrl.version),
  testTimeout: _axiosPost(apiUrl.testTimeout),
  health: _axiosGet(apiUrl.health),
};
