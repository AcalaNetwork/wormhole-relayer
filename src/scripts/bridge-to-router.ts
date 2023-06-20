import { Wallet } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { JsonRpcProvider } from '@ethersproject/providers';

import { getErc20Balance, transferFromBSCToKarura } from '../__tests__/utils';

dotenv.config({ path: path.join(__dirname, '.env') });
const key = process.env.KEY;
if (!key) throw new Error('KEY is not defined');

(async () => {
  const USDC_BSC = '0xB04906e95AB5D797aDA81508115611fee694c2b3';
  const routerAddr = '0x7745CAf117104FABCF5b0e4815184d7c3b2f99D9';
  const ETH_RPC_BSC = 'https://endpoints.omniatech.io/v1/bsc/mainnet/public';

  const provider = new JsonRpcProvider(ETH_RPC_BSC);
  const wallet = new Wallet(key, provider);

  const bal = await getErc20Balance(USDC_BSC, wallet);
  console.log(`usdc balance: ${bal}`);

  const signedVAA = await transferFromBSCToKarura('0.05', USDC_BSC, routerAddr, wallet, true);
  console.log({ signedVAA });
})();
