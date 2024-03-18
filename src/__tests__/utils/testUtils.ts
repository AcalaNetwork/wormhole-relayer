import { ApiPromise } from '@polkadot/api';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { Wallet } from 'ethers';
import { expect } from 'vitest';
import {  parseUnits } from 'ethers/lib/utils';
import axios from 'axios';

import { KARURA_USDC_ADDRESS } from './testConsts';

export const encodeXcmDest = (_data: any) => {
  // TODO: use api to encode
  return '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
};

export const getBasiliskUsdcBalance = async (api: ApiPromise, addr: string) => {
  const balance = await api.query.tokens.accounts(addr, 3);
  return (balance as any).free.toBigInt();
};

export const transferToRouter = async (
  routerAddr: string,
  signer: Wallet,
  tokenAddr = KARURA_USDC_ADDRESS,
  amount = 0.001,
) => {
  const token = ERC20__factory.connect(tokenAddr, signer);

  const decimals = await token.decimals();
  const routeAmount = parseUnits(String(amount), decimals);

  const routerBal = await token.balanceOf(routerAddr);
  if (routerBal.gt(0)) {
    expect(routerBal.toBigInt()).to.eq(routeAmount.toBigInt());
  } else {
    const signerTokenBal = await token.balanceOf(signer.address);
    if (signerTokenBal.lt(routeAmount)) {
      throw new Error(`signer ${signer.address} has no enough token [${tokenAddr}] to transfer! ${signerTokenBal.toBigInt()} < ${routeAmount.toBigInt()}`);
    }
    await (await token.transfer(routerAddr, routeAmount)).wait();
  }
};
export const mockXcmToRouter = transferToRouter;

export const expectError = (err: any, msg: any, code: number) => {
  if (axios.isAxiosError(err)) {
    expect(err.response?.status).to.equal(code);
    expect(err.response?.data.error).to.deep.equal(msg);
  } else {    // HttpError from supertest
    expect(err.status).to.equal(code);
    expect(JSON.parse(err.text).error).to.deep.equal(msg);
  }
};

export const expectErrorData = (err: any, expectFn: any) => {
  expectFn(
    axios.isAxiosError(err)
      ? err.response?.data
      : JSON.parse(err.text),
  );
};
