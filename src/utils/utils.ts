import { AcalaJsonRpcProvider } from '@acala-network/eth-providers';
import { BigNumber, Contract, Signer, Wallet, ethers } from 'ethers';
import { CHAIN_ID_ACALA, CHAIN_ID_BSC, CHAIN_ID_KARURA, CONTRACTS } from '@certusone/wormhole-sdk';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

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

export const getErc20Balance = async (tokenAddr: string, signer: Signer): Promise<string> => {
  const erc20 = new Contract(tokenAddr, [
    'function decimals() view returns (uint8)',
    'function balanceOf(address _owner) public view returns (uint256 balance)',
  ], signer);
  const [bal, decimals] = await Promise.all([
    erc20.balanceOf(await signer.getAddress()),
    erc20.decimals(),
  ]);

  return formatUnits(bal, decimals);
};

export const transferErc20 = async (
  tokenAddr: string,
  amount: string,
  dstAddr: string,
  signer: Signer,
): Promise<string> => {
  const erc20 = ERC20__factory.connect(tokenAddr, signer);
  const parsedAmount = parseUnits(amount, await erc20.decimals());

  const tx = await erc20.transfer(dstAddr, parsedAmount);
  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const testTimeout = async (request: any, response: any): Promise<void> => {
  const timeout = request.body.timeout ?? 120000;
  await new Promise(resolve => setTimeout(resolve, timeout));

  return response.status(200).json({
    msg: `${timeout} timeout ok`,
  });
};

export const transferFromBSC = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
  dstChainId: ROUTER_CHAIN_ID,
  wallet: Wallet,
  isMainnet = false,
): Promise<string> => {
  const tokenBridgeAddr = CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].bsc.token_bridge;
  const coreBridgeAddr = CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].bsc.core;
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
  console.log('transfer from BSC complete', { sequence }, 'waiting for VAA...');

  return getSignedVAAFromSequence(
    sequence,
    CHAIN_ID_BSC,
    tokenBridgeAddr,
    isMainnet,
  );
};
