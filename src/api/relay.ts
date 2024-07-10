import { TransactionReceipt } from '@ethersproject/providers';
import { hexToUint8Array, tryHexToNativeString } from '@certusone/wormhole-sdk';

import { RELAY_CONFIG } from '../consts';
import {
  RelayError,
  RelayParams,
  RouterChainId,
  ShouldRelayParams,
  getChainConfig,
  parseVaaPayload,
  relayEVM,
} from '../utils';

interface ShouldRelayResult {
  shouldRelay: boolean;
  msg: string;
}

export const relay = async (params: RelayParams): Promise<TransactionReceipt> =>  {
  const vaaInfo = await parseVaaPayload(hexToUint8Array(params.signedVAA));
  const {
    amount,
    targetChain,
    originChain,
    originAddress,
  } = vaaInfo;
  const originAsset = tryHexToNativeString(originAddress, originChain);

  const { shouldRelay: _shouldRelay, msg } = await shouldRelay({
    targetChain,
    originAsset,
    amount: amount.toString(),
  });

  if (!_shouldRelay) {
    throw new RelayError(msg, { params, vaaInfo });
  }

  try {
    // already passed shouldRelay check, targetChain must be router chain
    const chainConfigInfo = await getChainConfig(params.targetChain as RouterChainId);
    const receipt = await relayEVM(chainConfigInfo, params.signedVAA);

    return receipt;
  } catch (e) {
    const errMsg = e.error?.reason ?? 'no error msg found';
    throw new RelayError(errMsg, { params, vaaInfo, error: e });
  }
};

export const shouldRelay = async (params: ShouldRelayParams) => {
  const { targetChain, originAsset, amount: _amount } = params;

  const _noRelay = (msg: string): ShouldRelayResult => ({ shouldRelay: false, msg });

  let amount: bigint;
  try {
    amount = BigInt(_amount);
  } catch (e) {
    return _noRelay(`failed to parse amount: ${_amount}`);
  }

  const supported = RELAY_CONFIG[targetChain];
  if (!supported) {
    return _noRelay(`target chain ${targetChain} is not supported`);
  }

  const minTransfer = supported[originAsset.toLowerCase()];
  if (!minTransfer) {
    return _noRelay(`originAsset ${originAsset} not supported`);
  }

  if (amount < BigInt(minTransfer)) {
    return _noRelay(`transfer amount too small, expect at least ${minTransfer}`);
  }

  return { shouldRelay: true, msg: '' };
};
