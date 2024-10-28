import { ACA, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { BaseRouter__factory, DropAndSwapStakeFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { DEX } from '@acala-network/contracts/utils/Predeploy';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { constants } from 'ethers';

import { DROP_AMOUNT_ACA, DROP_SWAP_AMOUNT_JITOSOL, EUPHRATES_ADDR, EUPHRATES_POOLS, SWAP_SUPPLY_TOKENS } from '../consts';
import {
  Mainnet,
  RouteError,
  SwapAndLpParams,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
  parseRouterAddr,
} from '../utils';
import { db } from '../db';

const JITOSOL_ADDR = ROUTER_TOKEN_INFO.jitosol.acalaAddr;
const DEFAULT_SWAP_AND_LP_PARAMS = {
  euphrates: EUPHRATES_ADDR,
  dex: DEX,
  dropToken: ACA,
  dropFee: DROP_SWAP_AMOUNT_JITOSOL,
  path: [JITOSOL_ADDR, LDOT],
};

const prepareSwapAndLp = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, dropAndSwapStakeFactoryAddr, wallet } = chainConfig;

  const factory = DropAndSwapStakeFactory__factory.connect(dropAndSwapStakeFactoryAddr!, wallet);
  return { factory, feeAddr, relayerAddr: wallet.address };
};

export const shouldRouteSwapAndLp = async (params: SwapAndLpParams) => {
  try {
    const { factory, feeAddr, relayerAddr } = await prepareSwapAndLp(Mainnet.Acala);

    if (!EUPHRATES_POOLS.includes(params.poolId)) {
      throw new RouteError(`euphrates poolId ${params.poolId} is not supported`, params);
    }

    const insts = {
      ...DEFAULT_SWAP_AND_LP_PARAMS,
      recipient: params.recipient,
      feeReceiver: relayerAddr,
      swapAmount: params.swapAmount,
      poolId: params.poolId,
      minShareAmount: params.minShareAmount ?? 0,
    };

    /* ---------- TODO: remove this check later after approved max ---------- */
    const aca = ERC20__factory.connect(ACA, factory.signer);
    const allowance = await aca.allowance(relayerAddr, factory.address);
    if (allowance.lt(DROP_AMOUNT_ACA)) {
      console.log('granting allowance');
      await (await aca.approve(factory.address, constants.MaxUint256)).wait();
    } else {
      console.log('allowance ok');
    }
    /* ----------------------------------------------------------------------- */

    const routerAddr = await factory.callStatic.deployDropAndSwapStakeRouter(
      feeAddr,
      insts,
      DROP_AMOUNT_ACA,
    );

    return {
      shouldRoute: true,
      routerAddr,
    };
  } catch (err) {
    return {
      shouldRoute: false,
      msg: err.message,
    };
  }
};

export const routeSwapAndLp = async (params: SwapAndLpParams) => {
  if (params.token === undefined) {
    throw new RouteError('[token] param is required for swap and lp', params);
  }

  if (!SWAP_SUPPLY_TOKENS.includes(params.token as any)) {
    throw new RouteError(`token ${params.token} is not supported for swapping`, params);
  }

  const { factory, feeAddr, relayerAddr } = await prepareSwapAndLp(Mainnet.Acala);
  const insts = {
    ...DEFAULT_SWAP_AND_LP_PARAMS,
    recipient: params.recipient,
    feeReceiver: relayerAddr,
    swapAmount: params.swapAmount,
    poolId: params.poolId,
    minShareAmount: params.minShareAmount ?? 0,
  };

  const tx = await factory.deployDropAndSwapStakeRouterAndRoute(
    feeAddr,
    insts,
    params.token,
    DROP_AMOUNT_ACA,
  );
  const receipt = await tx.wait();

  const errParams = { ...params, txHash: receipt.transactionHash };
  if (receipt.status !== 1) {
    throw new RouteError('swap and lp failed', errParams);
  }

  let routerAddr: string;
  try {
    routerAddr = parseRouterAddr(receipt);
  } catch (err) {
    throw new RouteError(`failed to parse router addr from receipt: ${err.message}`, errParams);
  }

  const removed = await db.removeRouterInfo({ routerAddr });

  return {
    txHash: receipt.transactionHash,
    removed,
  };
};

export const rescueSwapAndLp = async (params: SwapAndLpParams) => {
  if (params.token === undefined) {
    throw new RouteError('[token] param is required for swap and lp', params);
  }

  const { factory, feeAddr, relayerAddr } = await prepareSwapAndLp(Mainnet.Acala);
  const insts = {
    ...DEFAULT_SWAP_AND_LP_PARAMS,
    recipient: params.recipient,
    feeReceiver: relayerAddr,
    swapAmount: params.swapAmount,
    poolId: params.poolId,
    minShareAmount: params.minShareAmount ?? 0,
  };

  const isGasDrop = true;
  const tx = await factory.deployDropAndSwapStakeRouterAndRescue(
    feeAddr,
    insts,
    params.token,
    DROP_AMOUNT_ACA,
    isGasDrop,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
