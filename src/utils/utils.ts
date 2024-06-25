import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { BigNumber, PopulatedTransaction, Wallet } from 'ethers';
import { CHAIN_ID_ACALA, CHAIN_ID_AVAX, CHAIN_ID_KARURA, CONTRACTS, hexToUint8Array } from '@certusone/wormhole-sdk';
import { DispatchError } from '@polkadot/types/interfaces';
import { ISubmittableResult } from '@polkadot/types/types';
import { JsonRpcProvider } from '@ethersproject/providers';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { SubstrateSigner } from '@acala-network/bodhi';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { decodeEthGas, sleep } from '@acala-network/eth-providers';
import { options } from '@acala-network/api';

import { RelayerError } from './error';
import { bridgeToken, getSignedVAAFromSequence } from './wormhole';
import { logger } from './logger';
import { parseAmount } from './token';

export const ROUTER_CHAIN_IDS = [CHAIN_ID_KARURA, CHAIN_ID_ACALA] as const;
export type RouterChainId = typeof ROUTER_CHAIN_IDS[number]

export const getApi = async (privateKey: string, nodeUrl: string) => {
  await cryptoWaitReady();
  const keyring = new Keyring({ type: 'sr25519' });
  const keyPair = keyring.addFromSeed(hexToUint8Array(privateKey));
  const substrateAddr = keyPair.address;

  const api = await ApiPromise.create(options({
    provider: new WsProvider(nodeUrl),
  }));

  api.setSigner(new SubstrateSigner(api.registry, keyPair));

  return { substrateAddr, api };
};

export const transferFromAvax = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
  dstChainId: RouterChainId,
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

export const getDispatchErrMsg = async (
  api: ApiPromise,
  err: DispatchError,
) => {
  if (err.isModule) {
    const decoded = api.registry.findMetaError(err.asModule);
    const { docs, method, section } = decoded;
    return `${section}.${method}: ${docs.join(' ')}`;
  }

  return err.toString();;
};

export const dryRunExtrinsic = async (
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
) => {
  const res = await api.rpc.system.dryRun(extrinsic.toHex());

  if (res.isErr) {
    const err = res.asErr;
    const errMsg = err.toString();

    throw new RelayerError('extrinsic dry run throws validity error', {
      extrinsic: extrinsic.toHex(),
      errMsg,
    });
  }

  if (res.isOk && res.asOk.isErr) {
    const err = res.asOk.asErr;
    const errMsg = getDispatchErrMsg(api, err);

    throw new RelayerError('extrinsic dry run throws dispatch error', {
      extrinsic: extrinsic.toHex(),
      errMsg,
    });
  }
};

export const sendExtrinsic = async (
  api: ApiPromise,
  provider: JsonRpcProvider,
  extrinsic: SubmittableExtrinsic<'promise', ISubmittableResult>,
  confirmations?: number,
  timeout?: number,
) => {
  await dryRunExtrinsic(api, extrinsic);

  await extrinsic.send();
  const txHash = extrinsic.hash.toHex();

  const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);
  if (receipt.status === 0) {
    const reason = await getTxFailingReason(txHash, provider);
    throw new RelayerError('tx failed', { txHash, reason });
  }

  return receipt.transactionHash;
};

const DEFAULT_GAS_LIMIT = 109920n;
export const getEthExtrinsic = async (
  api: ApiPromise,
  provider: JsonRpcProvider,
  tx: PopulatedTransaction,
  allowFailure = false,
) => {
  const gasPrice = (await provider.getGasPrice()).toBigInt();
  let gasLimit = DEFAULT_GAS_LIMIT;

  try {
    gasLimit = (await provider.estimateGas({ ...tx, gasPrice })).toBigInt();
  } catch (err) {
    if (!allowFailure) {
      throw new RelayerError('failed to estimate gas limit', { err, tx });
    }
    // swallow and use default gas limit
  }

  if (!tx.to) {
    throw new RelayerError('tx.to is undefined when constructing eth extrinsic', { tx });
  }

  const {
    gasLimit: substrateGasLimit,
    storageLimit,
  } = decodeEthGas({
    gasLimit: BigNumber.from(gasLimit),
    gasPrice: BigNumber.from(gasPrice),
  });

  return api.tx.evm.strictCall(
    tx.to,
    tx.data ?? '0x',
    tx.value?.toBigInt() ?? 0,
    substrateGasLimit,
    storageLimit,
    [],
  );
};

// TODO: ideally this only retries on certain errors, such as network issues
export const runWithRetry = async <T>(
  fn: () => Promise<T>,
  { retry = 10, interval = 5 } = {},
): Promise<T> => {
  let error: any;
  for (let i = 0; i < retry; i++) {
    try {
      return await fn();
    } catch (err) {
      error = err;
      logger.info(`retrying ${fn.name} in ${interval}s [${i + 1}/${retry}]`);
      await sleep(interval);
    }
  }

  throw error;
};
