import { ACA, LDOT } from '@acala-network/contracts/utils/AcalaTokens';
import { DEX } from '@acala-network/contracts/utils/Predeploy';
import { DropAndBootstrapStakeFactory__factory } from '@acala-network/asset-router/dist/typechain-types';
import { ERC20__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ROUTER_TOKEN_INFO } from '@acala-network/asset-router/dist/consts';
import { constants } from 'ethers';

import { DROP_AMOUNT_ACA, DROP_SWAP_AMOUNT_JITOSOL, EUPHRATES_ADDR } from '../consts';
import {
  DropAndBootstrapParams,
  Mainnet,
  _populateRelayTx,
  _populateRouteTx,
  getChainConfig,
  getMainnetChainId,
} from '../utils';

const JITOSOL_ADDR = ROUTER_TOKEN_INFO.jitosol.acalaAddr;
const DEFAULT_DROP_AND_BOOTSTRAP_PARAMS = {
  euphrates: EUPHRATES_ADDR,
  dex: DEX,
  dropToken: ACA,
  poolId: 7,
};

const prepareDropAndBoostrap = async () => {
  const chainId = getMainnetChainId(Mainnet.Acala);
  const chainConfig = await getChainConfig(chainId);
  const { feeAddr, dropAndBootstrapStakeFactoryAddr, wallet } = chainConfig;

  const factory = DropAndBootstrapStakeFactory__factory
    .connect(dropAndBootstrapStakeFactoryAddr!, wallet);

  return { factory, feeAddr, relayerAddr: wallet.address };
};

export const shouldRouteDropAndBoostrap = async (params: DropAndBootstrapParams) => {
  try {
    const { factory, feeAddr, relayerAddr } = await prepareDropAndBoostrap();

    const dropFee = params.gasDrop ? DROP_SWAP_AMOUNT_JITOSOL : 0;
    const dropAmountAca = params.gasDrop ? DROP_AMOUNT_ACA : 0;
    const otherContributionToken = params.feeToken === 'jitosol' ? LDOT : JITOSOL_ADDR;

    const insts = {
      ...DEFAULT_DROP_AND_BOOTSTRAP_PARAMS,
      recipient: params.recipient,
      feeReceiver: relayerAddr,
      dropFee,
      otherContributionToken,
    };

    /* ---------- TODO: remove this check later after approved max ---------- */
    const aca = ERC20__factory.connect(ACA, factory.signer);
    const allowance = await aca.allowance(relayerAddr, factory.address);
    if (allowance.lt(dropAmountAca)) {
      console.log('granting allowance');
      await (await aca.approve(factory.address, constants.MaxUint256)).wait();
    } else {
      console.log('allowance ok');
    }
    /* ----------------------------------------------------------------------- */

    const routerAddr = await factory.callStatic.deployDropAndBootstrapStakeRouter(
      feeAddr,
      insts,
      dropAmountAca,
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

export const routeDropAndBoostrap = async (params: DropAndBootstrapParams) => {
  const { factory, feeAddr, relayerAddr } = await prepareDropAndBoostrap();

  const dropFee = params.gasDrop ? DROP_SWAP_AMOUNT_JITOSOL : 0;
  const dropAmountAca = params.gasDrop ? DROP_AMOUNT_ACA : 0;
  const [tokenAddr, otherContributionToken] = params.feeToken === 'jitosol'
    ? [JITOSOL_ADDR, LDOT]
    : [LDOT, JITOSOL_ADDR];

  const insts = {
    ...DEFAULT_DROP_AND_BOOTSTRAP_PARAMS,
    recipient: params.recipient,
    feeReceiver: relayerAddr,
    dropFee,
    otherContributionToken,
  };

  const tx = await factory.deployDropAndBootstrapStakeRouterAndRoute(
    feeAddr,
    insts,
    tokenAddr,
    dropAmountAca,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};
