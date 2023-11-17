import { evmToAddr32, nativeToAddr32 } from '@acala-network/asset-router/dist/utils';
import { isEvmAddress, isSubstrateAddress } from '@acala-network/eth-providers';

export const toAddr32 = (addr: string) => {
  if (!isEvmAddress(addr) || !isSubstrateAddress(addr)) {
    throw new Error(`address ${addr} is not a valid evm or substrate address`);
  }

  return isEvmAddress(addr)
    ? evmToAddr32(addr)
    : nativeToAddr32(addr);
};
