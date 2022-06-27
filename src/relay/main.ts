import {
  ChainId,
  hexToUint8Array,
} from '@certusone/wormhole-sdk';
import { RelayerEnvironment, validateEnvironment } from '../configureEnv';
import { relayEVM, shouldRelay, parseVaa, shouldRelayVaa } from './utils';

const env: RelayerEnvironment = validateEnvironment();

const getChainConfigInfo = (chainId: ChainId) => {
  return env.supportedChains.find((x) => x.chainId === chainId);
};

const validateRequest = async (request: any, response: any) => {
  const chainId = request.body?.targetChain;
  const chainConfigInfo = getChainConfigInfo(chainId);

  if (!chainConfigInfo) {
    return response.status(400).json({ error: 'Unsupported chainId', chainId });
  }

  const signedVAA = request.body?.signedVAA;
  if (!signedVAA) {
    return response.status(400).json({ error: 'signedVAA is required' });
  }

  // parse & validate VAA, make sure we want to relay this request
  const vaaInfo = await parseVaa(hexToUint8Array(signedVAA));
  const vaaInfoString = JSON.stringify(vaaInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
  console.log(`parsed VAA info: ${vaaInfoString}`);

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
  } = await validateRequest(request, response);

  if (!chainConfigInfo) return;

  const relayInfo = JSON.stringify({ chainId, signedVAA });
  console.log(`relaying: ${relayInfo}`);

  try {
    const receipt = await relayEVM(chainConfigInfo, signedVAA);
    
    console.log(`Relay Succeed 🎉🎉: ${relayInfo}, txHash: ${receipt.transactionHash}`);
    response.status(200).json(receipt);
  } catch (e) {
    console.log(`Relay Failed ❌: ${relayInfo}`);
    console.error(e);
    return response.status(500).json({ error: e, msg: 'Unable to relay this request.' });
  }
};

export const checkShouldRelay = (request: any, response: any): void =>  {
  const res = shouldRelay(request.query);

  console.log(`checkShouldRelay: ${JSON.stringify({ ...request.query, ...res })}`);
  response.status(200).json(res);
};
