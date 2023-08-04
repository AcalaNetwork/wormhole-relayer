import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { BigNumber, Contract, PopulatedTransaction, Signer, Wallet, ethers } from 'ethers';
import { CHAIN_ID_ACALA, CHAIN_ID_AVAX, CHAIN_ID_KARURA, CONTRACTS, hexToUint8Array } from '@certusone/wormhole-sdk';
import { ISubmittableResult } from '@polkadot/types/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { SubstrateSigner } from '@acala-network/bodhi';
import { options } from '@acala-network/api';
import { parseUnits } from 'ethers/lib/utils';

import { ChainConfig } from './configureEnv';
import { RelayerError } from '../middlewares';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { bridgeToken, getSignedVAAFromSequence } from './wormhole';

export type ROUTER_CHAIN_ID = typeof CHAIN_ID_KARURA | typeof CHAIN_ID_ACALA;

export const getSigner = async (config: ChainConfig): Promise<Signer> => {
  const provider = new AcalaJsonRpcProvider(config.ethRpc);
  return new ethers.Wallet(config.walletPrivateKey, provider);
};

// TODO: reuse api
export const getApi = async (config: ChainConfig) => {
  const keyring = new Keyring({ type: 'sr25519' });
  const keyPair = keyring.addFromSeed(hexToUint8Array(config.walletPrivateKey));
  const addr = keyPair.address;

  const api = await ApiPromise.create(options({
    provider: new WsProvider(config.nodeUrl),
  }));

  api.setSigner(new SubstrateSigner(api.registry, keyPair));

  return { addr, api };
};

export const parseAmount = async (tokenAddr: string, amount: string, provider: any): Promise<BigNumber> => {
  const erc20 = new Contract(tokenAddr, ['function decimals() view returns (uint8)'], provider);
  const decimals = await erc20.decimals();

  return parseUnits(amount, decimals);
};

export const transferFromAvax = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
  dstChainId: ROUTER_CHAIN_ID,
  wallet: Wallet,
  isMainnet = false,
): Promise<string> => {
  const tokenBridgeAddr = CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].avalanche.token_bridge;
  const coreBridgeAddr = CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].avalanche.core;
  const parsedAmount = await parseAmount(sourceAsset, amount, wallet);
  const { sequence } = await bridgeToken(
    wallet,
    tokenBridgeAddr,
    coreBridgeAddr,
    recipientAddr,
    sourceAsset,
    dstChainId,
    parsedAmount,
  );
  console.log('transfer from AVAX complete', { sequence }, 'waiting for VAA...');

  return getSignedVAAFromSequence(
    sequence,
    CHAIN_ID_AVAX,
    tokenBridgeAddr,
    isMainnet,
  );
};

// TODO: add exitReason to receipt directly
export const getTxFailingReason = async (txHash: string, provider: JsonRpcProvider): Promise<string> => {
  const tx = await provider.getTransaction(txHash);
  try {
    await provider.call(tx as any, tx.blockNumber);
  } catch (err) {
    console.log(err);

    return err.message;
  }

  return '0x';
};

export const sendExtrinsic = async (
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  provider: JsonRpcProvider,
  confirmations?: number,
  timeout?: number,
) => {
  // TODO: dry run before sending
  await extrinsic.send();
  const txHash = extrinsic.hash.toHex();
  console.log({ txHash });

  const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);
  if (receipt.status === 0) {
    const reason = await getTxFailingReason(txHash, provider);
    throw new RelayerError('tx failed', { txHash, reason });
  }

  return receipt.transactionHash;
};

export const getEthExtrinsic = (
  api: ApiPromise,
  tx: PopulatedTransaction,
) => {
  // TODO: estimate more precise gas params
  const gasPrice = 100009999999n;
  const gasLimit = 109920n;

  return api.tx.evm.ethCallV2(
    { Call: tx.to },
    tx.data,
    tx.value?.toString(),
    gasPrice,
    gasLimit,
    [],
  );
};

