import {
  getEmitterAddressEth,
  uint8ArrayToHex,
  CHAIN_ID_BSC,
  CHAIN_ID_KARURA,
  ChainId,
  CONTRACTS,
} from '@certusone/wormhole-sdk';
import getSignedVAAWithRetry from '@certusone/wormhole-sdk/lib/cjs/rpc/getSignedVAAWithRetry';
import { BigNumber, Contract, Signer, Wallet, ethers } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import { bridgeToken } from '../utils';
import {
  WORMHOLE_GUARDIAN_RPC,
  ETH_RPC_BSC,
  TEST_USER_PRIVATE_KEY,
} from './consts';
import { formatUnits, parseUnits } from '@ethersproject/units';

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

export const getSignedVAAFromSequence = async (
  sequence: string,
  chainId: ChainId,
  tokenBridgeAddr: string,
) => {
  const emitterAddress = getEmitterAddressEth(tokenBridgeAddr);
  const { vaaBytes } = await getSignedVAAWithRetry(
    WORMHOLE_GUARDIAN_RPC,
    chainId,
    emitterAddress,
    sequence,
    { transport: NodeHttpTransport() },
  );

  return uint8ArrayToHex(vaaBytes);
};

export const transferFromBSCToKarura = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
  wallet?: Wallet,
  isMainnet = false,
): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC_BSC);
  const signer = wallet ?? new ethers.Wallet(TEST_USER_PRIVATE_KEY, provider);

  const parsedAmount = await parseAmount(sourceAsset, amount, signer);
  const { sequence } = await bridgeToken(
    signer,
    CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].bsc.token_bridge,
    CONTRACTS[isMainnet ? 'MAINNET' : 'TESTNET'].bsc.core,
    recipientAddr,
    sourceAsset,
    CHAIN_ID_KARURA,
    parsedAmount,
  );
  console.log('transfer from BSC complete', { sequence }, 'waiting for VAA...');

  return getSignedVAAFromSequence(
    sequence,
    CHAIN_ID_BSC,
    CONTRACTS.TESTNET.bsc.token_bridge,
  );
};
