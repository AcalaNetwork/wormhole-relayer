import { hexToUint8Array } from '@certusone/wormhole-sdk';

import { VERSION } from '../consts';
import { getChainConfig } from '../utils/configureEnv';
import { logger } from '../utils/logger';
import { parseVaaPayload } from '../utils/wormhole';
import { relayEVM, shouldRelay, shouldRelayVaa } from '../utils/relay';

const validateRelayRequest = async (request: any, response: any) => {
  const chainId = request.body?.targetChain;
  const chainConfigInfo = getChainConfig(chainId);

  if (!chainConfigInfo) {
    return response.status(400).json({ error: 'Unsupported chainId', chainId });
  }

  const signedVAA = request.body?.signedVAA;
  if (!signedVAA) {
    return response.status(400).json({ error: 'signedVAA is required' });
  }

  // parse & validate VAA, make sure we want to relay this request
  const vaaInfo = await parseVaaPayload(hexToUint8Array(signedVAA));
  logger.debug(vaaInfo, 'parsed VAA info');

  const { shouldRelay: _shouldRelay, msg } = shouldRelayVaa(vaaInfo);
  if (!_shouldRelay) {
    return response.status(400).json({
      error: msg,
      vaaInfo: {
        ...vaaInfo,
        amount: vaaInfo.amount.toString(),
      },
    });
  }

  return { chainConfigInfo, chainId, signedVAA };
};

export const relay = async (request: any, response: any): Promise<void> =>  {
  const {
    chainConfigInfo,
    chainId,
    signedVAA,
  } = await validateRelayRequest(request, response);

  if (!chainConfigInfo) return;

  const relayInfo = { chainId, signedVAA };
  logger.debug(relayInfo, 'relaying ...');

  try {
    const receipt = await relayEVM(chainConfigInfo, signedVAA);
    logger.debug({ ...relayInfo, txHash: receipt.transactionHash }, 'Relay Succeed 🎉🎉');

    return response.status(200).json(receipt);
  } catch (e) {
    logger.debug(relayInfo, 'Relay Failed ❌');
    logger.error(e);

    return response.status(500).json({
      error: e,
      msg: 'Unable to relay this request.',
      params: relayInfo,
    });
  }
};

export const checkShouldRelay = (request: any, response: any): void =>  {
  const res = shouldRelay(request.query);

  logger.debug({ ...request.query, res }, 'checkShouldRelay');
  response.status(200).json(res);
};

export const getVersion = (request: any, response: any): void => response.status(200).end(VERSION);
