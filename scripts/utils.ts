import { BigNumberish, ContractReceipt, Wallet } from 'ethers';
import { CONTRACTS, ChainName, hexToUint8Array, transferFromEth, tryNativeToHexString } from '@certusone/wormhole-sdk';
import assert from 'assert';

export const bridgeToken = async (
  signer: Wallet,
  srcChain: ChainName,
  dstChain: ChainName,
  dstAddr: string,
  sourceTokenAddr: string,
  amount: BigNumberish,
): Promise<ContractReceipt> => {
  const dstChainHex = tryNativeToHexString(dstAddr, dstChain);
  const dstChainUint8 = hexToUint8Array(dstChainHex);

  const tokenBridgeAddr = CONTRACTS.MAINNET[srcChain].token_bridge;
  assert(tokenBridgeAddr, 'token bridge address not found');

  console.log(`sending bridging tx with wallet ${signer.address} and amount ${amount} ...`);
  const receipt = await transferFromEth(
    tokenBridgeAddr,
    signer,
    sourceTokenAddr,
    amount,
    dstChain,
    dstChainUint8,
  );

  return receipt;
};
