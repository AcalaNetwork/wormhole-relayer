import '@wormhole-foundation/connect-sdk-evm-tokenbridge';

import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Network, TokenTransfer, TransactionId, TransferState, Wormhole, normalizeAmount } from '@wormhole-foundation/connect-sdk';
import { Wallet } from 'ethers';
import { formatEther, parseEther } from 'ethers/lib/utils';
import { getEvmSigner } from '@wormhole-foundation/connect-sdk-evm/dist/cjs/testing';

import { ETH_RPC } from '../../consts';
import { TEST_KEY } from './testConsts';
import { WhEvmSigner } from './whSigner';
import { ok, start } from './logger';

export async function waitForAttestation<N extends Network = Network>(
  wh: Wormhole<N>,
  xfer: TokenTransfer<N>,
): Promise<TransactionId> {
  const tracker = TokenTransfer.track(wh, TokenTransfer.getReceipt(xfer), 100000);

  for await (const receipt of tracker) {
    console.log('Current trasfer state: ', TransferState[receipt.state]);
    if (receipt.state === TransferState.Attested) {
      const txId = receipt.originTxs[0];
      return txId;
    }
  }

  throw new Error('tx never got attested');
}

export const transferFromFujiToKaruraTestnet = async (
  wh: Wormhole<Network>,
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
): Promise<TransactionId> => {
  start('checking user balance');
  const provider = new JsonRpcProvider(ETH_RPC.FUJI);
  const wallet = new Wallet(TEST_KEY.USER, provider);

  const bal = await wallet.getBalance();
  if (bal.lt(parseEther('0.03'))) {
    throw new Error(`${wallet.address} has insufficient balance on fuji! bal: ${formatEther(bal)}`);
  }
  ok();

  start('setting up wormhole context');
  const srcChain = wh.getChain('Avalanche');
  const dstChain = wh.getChain('Karura');
  const signer = await getEvmSigner(await srcChain.getRpc(), TEST_KEY.USER);
  ok();

  start('constructing trasnfer tx');
  const decimals = 6n;
  const normalizedAmount = normalizeAmount(amount, decimals);
  const xfer = await wh.tokenTransfer(
    Wormhole.chainAddress(srcChain.chain, sourceAsset),
    normalizedAmount, // Amount in base units
    Wormhole.chainAddress(srcChain.chain, signer.address()), // Sender address on source chain
    Wormhole.chainAddress(dstChain.chain, recipientAddr), // Recipient address on destination chain
    false, // No Automatic transfer
  );
  ok();

  start('initiating transfer');
  await xfer.initiateTransfer(signer);
  ok();

  console.log('waiting for attestation ...');
  const txId = await waitForAttestation(wh, xfer);

  /* ---------- alternatively wait for attestation manually (no status update) ---------- */
  // const srcTxids = await xfer.initiateTransfer(signer);
  // console.log('srcTxids', srcTxids);

  // const timeout = 600_000;
  // const attestIds = await xfer.fetchAttestation(timeout);
  // console.log('attestIds', attestIds);
  /* ------------------------------------------------------- ---------- */

  return txId;
};

export const completeTransfer = async (wh: Wormhole<Network>, txId: TransactionId) => {
  start('re-constructing trasnfer tx');
  const xfer = await TokenTransfer.from(wh, txId);
  ok();

  const dstChain = wh.getChain('Karura');   // TODO: get dstChain from VAA or by param?
  const dstProvider = new AcalaJsonRpcProvider(ETH_RPC.KARURA_TESTNET);
  const dstWallet = new Wallet(TEST_KEY.USER, dstProvider);
  const dstSigner = new WhEvmSigner(dstWallet, dstChain.chain);

  start('completing trasnfer');
  const destTxids = await xfer.completeTransfer(dstSigner);
  ok(JSON.stringify(destTxids));
};
