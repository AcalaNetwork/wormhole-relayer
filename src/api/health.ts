import { CHAIN_ID_ACALA, CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { formatEther, parseEther } from 'ethers/lib/utils';

import { getChainConfig } from '../utils';

const MIN_BALANCE_ACALA = parseEther('15');
const MIN_BALANCE_KARURA = parseEther('10');

export const healthCheck = async () => {
  const [chainConfigAcala, chainConfigKarura] = await Promise.all([
    getChainConfig(CHAIN_ID_ACALA),
    getChainConfig(CHAIN_ID_KARURA),
  ]);

  const [relayerBalAcala, relayerBalKarura] = await Promise.all([
    chainConfigAcala.wallet.getBalance(),
    chainConfigKarura.wallet.getBalance(),
  ]);

  const isHealthy = (
    relayerBalAcala.gt(MIN_BALANCE_ACALA) &&
    relayerBalKarura.gt(MIN_BALANCE_KARURA)
  );

  return {
    relayerBalAcala: formatEther(relayerBalAcala),
    relayerBalKarura: formatEther(relayerBalKarura),
    isHealthy,
  };
};
