import { decodeAddress } from '@polkadot/util-crypto';
import { evmToAddr32, nativeToAddr32 } from '@acala-network/asset-router/dist/utils';
import { isEvmAddress } from '@acala-network/eth-providers';

export const isSubstrateAddress = (addr: string) => {
  try {
    const decoded = decodeAddress(addr);
    return decoded.length === 32;
  } catch (e) {
    return false;
  }
};

export const toAddr32 = (addr: string) => {
  const isEvm = isEvmAddress(addr);
  const isSubstrate = isSubstrateAddress(addr);

  if (!isEvm && !isSubstrate) {
    throw new Error(`address ${addr} is not a valid evm or substrate address`);
  }

  return isEvm
    ? evmToAddr32(addr)
    : nativeToAddr32(addr);
};
