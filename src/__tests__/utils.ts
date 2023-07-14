import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';

import { ETH_RPC } from '../consts';
import { TEST_USER_PRIVATE_KEY } from './consts';
import { transferFromBSC } from '../utils/utils';

export const transferFromBSCToKaruraTestnet = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
) => {
  const provider = new JsonRpcProvider(ETH_RPC.BSC);
  const wallet = new Wallet(TEST_USER_PRIVATE_KEY, provider);

  return await transferFromBSC(
    amount,
    sourceAsset,
    recipientAddr,
    CHAIN_ID_KARURA,
    wallet,
    false,
  );
};
