import {
  getEmitterAddressEth,
  uint8ArrayToHex,
  CHAIN_ID_BSC,
  CHAIN_ID_KARURA,
} from '@certusone/wormhole-sdk';
import getSignedVAAWithRetry from '@certusone/wormhole-sdk/lib/cjs/rpc/getSignedVAAWithRetry';
import { BigNumber, ethers } from 'ethers';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import { bridgeToken } from '../utils';
import {
  WORMHOLE_GUARDIAN_RPC,
  ETH_RPC_BSC,
  BSC_CORE_BRIDGE_ADDRESS,
  BSC_TOKEN_BRIDGE_ADDRESS,
  TEST_SENDER_PRIVATE_KEY,
} from './consts';

export const parseAmount = async (tokenAddr: string, amount: string, provider: any): Promise<BigNumber> => {
  const erc20Contract = new ethers.Contract(tokenAddr, ['function decimals() view returns (uint8)'], provider);
  const decimals = await erc20Contract.decimals();

  return ethers.utils.parseUnits(amount, decimals);
};

export const transferFromBSCToKarura = async (
  amount: string,
  sourceAsset: string,
  recipientAddr: string,
): Promise<string> => {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC_BSC);
  const signer = new ethers.Wallet(TEST_SENDER_PRIVATE_KEY, provider);

  const parsedAmount = await parseAmount(sourceAsset, amount, provider);
  const { sequence } = await bridgeToken(
    signer,
    BSC_TOKEN_BRIDGE_ADDRESS,
    BSC_CORE_BRIDGE_ADDRESS,
    recipientAddr,
    sourceAsset,
    CHAIN_ID_KARURA,
    parsedAmount,
  );
  console.log('transfer from BSC complete', { sequence }, 'waiting for VAA...');

  // poll until the guardian(s) witness and sign the vaa
  const emitterAddress = getEmitterAddressEth(BSC_TOKEN_BRIDGE_ADDRESS);
  const { vaaBytes } = await getSignedVAAWithRetry(
    WORMHOLE_GUARDIAN_RPC,
    CHAIN_ID_BSC,
    emitterAddress,
    sequence,
    { transport: NodeHttpTransport() },
  );

  const signedVAA = uint8ArrayToHex(vaaBytes);
  return signedVAA;
};
