import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { BigNumber, Contract, Signer, Wallet, ethers } from 'ethers';
import { CHAIN_ID_ACALA, CHAIN_ID_AVAX, CHAIN_ID_KARURA, CONTRACTS } from '@certusone/wormhole-sdk';
import { parseUnits } from 'ethers/lib/utils';

import { bridgeToken, getSignedVAAFromSequence } from './wormhole';

export type ROUTER_CHAIN_ID = typeof CHAIN_ID_KARURA | typeof CHAIN_ID_ACALA;

export const getSigner = async ({
  ethRpc,
  walletPrivateKey,
}: {
  ethRpc: string;
  walletPrivateKey: string;
}): Promise<Signer> => {
  const provider = new AcalaJsonRpcProvider(ethRpc);
  return new ethers.Wallet(walletPrivateKey, provider);
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
