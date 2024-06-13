import { ACA } from '@acala-network/contracts/utils/AcalaTokens';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { SwapAndStakeEuphratesFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { constants } from 'ethers';

import { EUPHRATES_ADDR, EUPHRATES_POOLS, RELAYER_ADDR } from '../consts';
import {
  Mainnet,
  RouteError,
  SwapAndRouteParams,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
} from '../utils';

const DEFAULT_SWAP_AND_ROUTE_PARAMS = {
  maker: RELAYER_ADDR,
  targetToken: ACA,
  euphrates: EUPHRATES_ADDR,
};

const prepareSwapAndRoute = async (chain: Mainnet) => {
  const chainId = getMainnetChainId(chain);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, swapAndStakeFactoryAddr, wallet } = chainConfig;

  const factory = SwapAndStakeEuphratesFactory__factory
    .connect(swapAndStakeFactoryAddr!, wallet);

  return { factory, feeAddr };
};

export const shouldSwapAndRoute = async (params: SwapAndRouteParams) => {
  try {
    const { factory, feeAddr } = await prepareSwapAndRoute(Mainnet.Acala);
    if (!EUPHRATES_POOLS.includes(params.poolId)) {
      throw new RouteError(`euphrates poolId ${params.poolId} is not supported`, params);
    }

    const insts = {
      ...DEFAULT_SWAP_AND_ROUTE_PARAMS,
      ...params,
    };

    /* ---------- TODO: remove this check later after approved max ---------- */
    const { targetAmount } = params;
    if (targetAmount) {
      const aca = ERC20__factory.connect(ACA, factory.signer);
      const allowance = await aca.allowance(insts.maker, factory.address);
      if (allowance.lt(targetAmount)) {
        await (await aca.approve(factory.address, constants.MaxUint256)).wait();
      }
    }
    /* ----------------------------------------------------------------------- */

    const routerAddr = await factory.callStatic.deploySwapAndStakeEuphratesRouter(
      feeAddr,
      insts,
      params.targetAmount ?? 0,
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

export const swapAndRoute = async (params: SwapAndRouteParams) => {
  if (params.token === undefined) {
    throw new RouteError('<token> param is required for swap and route', params);
  }

  const insts = {
    ...DEFAULT_SWAP_AND_ROUTE_PARAMS,
    ...params,
  };

  const { factory, feeAddr } = await prepareSwapAndRoute(Mainnet.Acala);
  const tx = await factory.deploySwapAndStakeEuphratesRouterAndRoute(
    feeAddr,
    insts,
    params.token,
    params.targetAmount ?? 0,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
