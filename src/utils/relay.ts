import { BigNumber, ContractReceipt } from 'ethers';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';
import { ERC20__factory, FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import {
  hexToUint8Array,
  redeemOnEth,
  tryNativeToHexString,
} from '@certusone/wormhole-sdk';

import { ChainConfig } from './configureEnv';
import { RelayAndRouteParams } from './validate';
import { RelayError } from './error';
import { parseVaaPayload } from './wormhole';


// for /relayAndRoute endpoint
const VAA_MAX_DECIMALS = 8;
export const checkShouldRelayBeforeRouting = async (
  params: RelayAndRouteParams,
  chainConfig: ChainConfig,
) => {
  const { tokenBridgeAddr, feeAddr, wallet } = chainConfig;
  const tokenBridge = Bridge__factory.connect(tokenBridgeAddr, wallet);
  const feeRegistry = FeeRegistry__factory.connect(feeAddr, wallet);

  const vaaInfo = await parseVaaPayload(hexToUint8Array(params.signedVAA));
  const {
    originAddress,
    amount: vaaAmount,     // min(originDecimal, VAA_MAX_DECIMALS)
    originChain,
  } = vaaInfo;

  const wrappedAddr = await tokenBridge.wrappedAsset(
    originChain,
    Buffer.from(tryNativeToHexString('0x' + originAddress, originChain), 'hex'),
  );

  const fee = await feeRegistry.getFee(wrappedAddr);
  if (fee.eq(0)) {
    throw new RelayError('unsupported token', { ...vaaInfo, amount: BigNumber.from(vaaAmount) });
  }

  const erc20 = ERC20__factory.connect(wrappedAddr, wallet);
  const originDecimals = await erc20.decimals();
  const realAmount = originDecimals <= VAA_MAX_DECIMALS
    ? vaaAmount
    : BigNumber.from(10).pow(originDecimals - VAA_MAX_DECIMALS).mul(vaaAmount);

  if (fee.gt(realAmount)) {
    throw new RelayError('token amount too small to relay', { ...vaaInfo, amount: BigNumber.from(vaaAmount) });
  }
};

export const relayEVM = async (
  chainConfig: ChainConfig,
  signedVAA: string,
): Promise<ContractReceipt> => {
  const receipt = await redeemOnEth(
    chainConfig.tokenBridgeAddr,
    chainConfig.wallet,
    hexToUint8Array(signedVAA),
  );

  return receipt;
};
