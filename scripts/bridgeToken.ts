import { JsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import assert from 'assert';
import dotenv from 'dotenv';

import { ETH_RPC } from '../src/consts';
import { bridgeToken } from './utils';

dotenv.config();

(async () => {
  const key = process.env.ACALA_PRIVATE_KEY;
  assert(key, 'KEY is required');

  const provider = new JsonRpcProvider(ETH_RPC.BSC);
  const wallet = new Wallet(key, provider);

  const srcChain = 'bsc';
  const dstChain = 'acala';
  const dstAddr = '0xb0D205eB2355795e7F95B02E23e030FacEa1E002';
  const DAI_BSC_ADDR = '0x3413a030EF81a3dD5a302F4B4D11d911e12ed337';
  const DAI_DECIMALS = 18;
  const amount = parseUnits('10.2', DAI_DECIMALS);

  const receipt = await bridgeToken(
    wallet,
    srcChain,
    dstChain,
    dstAddr,
    DAI_BSC_ADDR,
    amount,
  );

  console.log(`txHash: ${receipt.transactionHash}`);
  assert(receipt.status === 1, 'tx failed!');
})();
