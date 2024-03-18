import {
  Chain,
  Network,
  SignAndSendSigner,
  SignedTx,
  TxHash,
  UnsignedTransaction,
} from '@wormhole-foundation/connect-sdk';
import { TransactionRequest } from '@ethersproject/abstract-provider';
import { Wallet, ethers } from 'ethers';

// Wormhole SignOnlySender EvmSigner
export class WhEvmSigner<N extends Network, C extends Chain> implements SignAndSendSigner<N, C> {
  #wallet: ethers.Wallet;
  #chain: C;

  constructor(wallet: Wallet, chain: C) {
    this.#wallet = wallet;
    this.#chain = chain;
  }

  chain(): C {
    return this.#chain;
  }

  address(): string {
    return this.#wallet.address;
  }

  async _sign(txs: UnsignedTransaction[]): Promise<SignedTx[]> {
    const signed: string[] = [];

    let nonce = await this.#wallet.getTransactionCount('pending');

    for (const tx of txs) {
      const { transaction } = tx;
      const gasPrice = await this.#wallet.provider.getGasPrice();

      // TODO: estiamte gas doesn't seem to throw if tx fails, such as transfer amount too big
      const gasLimit = await this.#wallet.provider.estimateGas(transaction);
      const txReq: TransactionRequest = {
        ...transaction,
        nonce,
        gasLimit,
        gasPrice,
      };

      txReq.chainId = Number(txReq.chainId);    // TODO: remove me after upgrading to ethers V6

      signed.push(await this.#wallet.signTransaction(txReq));

      nonce += 1;
    }
    return signed;
  }

  async signAndSend(txs: UnsignedTransaction[]): Promise<TxHash[]> {
    const signed = await this._sign(txs);

    const hashes: string[] = [];
    for (const s of signed) {
      const tx = await this.#wallet.provider.sendTransaction(s);
      hashes.push(tx.hash);
    }
    return hashes;
  }
}
