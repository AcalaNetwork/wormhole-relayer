import {
  ChainId,
  // CHAIN_ID_Karura,    // TODO: import it when new sdk published
} from '@certusone/wormhole-sdk';
import { RelayerEnvironment, validateEnvironment } from '../configureEnv';
import { relayEVM, shouldRelay } from './utils';

const CHAIN_ID_Karura = 11;    // TODO: remove it

const env: RelayerEnvironment = validateEnvironment();

function getChainConfigInfo(chainId: ChainId) {
  return env.supportedChains.find((x) => x.chainId === chainId);
}

function validateRequest(request: any, response: any) {
  const chainId = request.body?.chainId;
  const chainConfigInfo = getChainConfigInfo(chainId);
  const unwrapNative = request.body?.unwrapNative || false;

  if (!chainConfigInfo) {
    response.status(400).json({ error: 'Unsupported chainId' });
    return;
  }
  const signedVAA = request.body?.signedVAA;
  if (!signedVAA) {
    response.status(400).json({ error: 'signedVAA is required' });
  }

  //TODO parse & validate VAA.
  //TODO accept redeem native parameter

  return { chainConfigInfo, chainId, signedVAA, unwrapNative };
}

export async function relay(request: any, response: any) {
  const { chainConfigInfo, chainId, signedVAA, unwrapNative } = validateRequest(
    request,
    response
  );

  console.log('relaying: ', { chainConfigInfo, chainId, signedVAA, unwrapNative });

  try {
    if (chainId === CHAIN_ID_Karura) {
      await relayEVM(
        chainConfigInfo,
        signedVAA,
        unwrapNative,
        request,
        response
      );
    } else {
      response.status(400).json({ error: `Improper chain ID: ${chainId}, expected ${CHAIN_ID_Karura} for Karura` });
    }
  } catch (e) {
    console.log('Error while relaying');
    console.error(e);
    response.status(500).json({ error: 'Unable to relay this request.' });
  }
}

export function checkShouldRelay(request: any, response: any) {
  console.log(request.query);

  const res = shouldRelay(request.query);
  response.status(200).json(res);
}
