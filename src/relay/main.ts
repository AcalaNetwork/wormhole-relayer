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
    return response.status(400).json({ error: 'Unsupported chainId' });
  }

  const signedVAA = request.body?.signedVAA;
  if (!signedVAA) {
    return response.status(400).json({ error: 'signedVAA is required' });
  }

  // parse & validate VAA, make sure we want to relay this request
  const vaaInfo = await parseVaa(hexToUint8Array(signedVAA));
  console.log('parsed VAA info: ', vaaInfo);

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

export async function relay(request: any, response: any) {
  const {
    chainConfigInfo,
    chainId,
    signedVAA,
  } = await validateRequest(request, response);

  if (!chainConfigInfo) return;

  console.log('relaying: ', { chainConfigInfo, chainId, signedVAA });

  try {
    await relayEVM(
      chainConfigInfo,
      signedVAA,
      request,
      response
    );

    console.log(`
      ---------------------------------------
      ---------- Relay Succeed 🎉🎉 ----------
      ---------------------------------------
    `);
  } catch (e) {
    console.log(`
      -------------------------------------
      ---------- Relay Failed ❌ ----------
      -------------------------------------
    `);
    console.error(e);
    return response.status(500).json({ error: e, msg: 'Unable to relay this request.' });
  }
}

export function checkShouldRelay(request: any, response: any) {
  const res = shouldRelay(request.query);

  console.log('checkShouldRelay:', request.query, res.shouldRelay);
  response.status(200).json(res);
}
