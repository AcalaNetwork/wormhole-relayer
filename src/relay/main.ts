import {
  ChainId,
  hexToUint8Array,
} from '@certusone/wormhole-sdk';
import axios from 'axios';
import { Wallet } from 'ethers';
import { RelayerEnvironment, validateEnvironment } from '../configureEnv';
import { BALANCE_LOW_THREASHOLD } from './consts';
import { relayEVM, shouldRelay, parseVaa, shouldRelayVaa, fetchBalance } from './utils';

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

export const relay = async (request: any, response: any): Promise<void> =>  {
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
};

export const checkShouldRelay = (request: any, response: any): void =>  {
  const res = shouldRelay(request.query);

  console.log('checkShouldRelay:', request.query, res.shouldRelay);
  response.status(200).json(res);
};

export const health = async (request: any, response: any): Promise<void> => {
  const {
    KARURA_PRIVATE_KEY,
    ACALA_PRIVATE_KEY,
    KARURA_RPC_URL_HTTP,
    ACALA_RPC_URL_HTTP,
  } = process.env;

  try {
    /* -------------------- prepare requests -------------------- */
    const relayerAddressKarura = new Wallet(KARURA_PRIVATE_KEY).address;
    const relayerAddressAcala = new Wallet(ACALA_PRIVATE_KEY).address;

    const shouldRelayURL = request.protocol + '://' + request.get('host') + '/shouldRelay';

    const shouldRelayPromise = axios.get(shouldRelayURL, {
      params: {
        originAsset: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
        amount: '10000000',
        targetChain: '11',
      }
    });

    const shouldNotRelayPromise = axios.get(shouldRelayURL, {
      params: {
        originAsset: '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd',
        amount: '100000',
        targetChain: '11',
      }
    });

    /* -------------------- get all results -------------------- */
    const [
      balanceKarura,
      balanceAcala,
      shouldRelay,
      shouldNotRelay,
    ] = await Promise.all([
      fetchBalance(relayerAddressKarura, KARURA_RPC_URL_HTTP),
      fetchBalance(relayerAddressAcala, ACALA_RPC_URL_HTTP),
      shouldRelayPromise,
      shouldNotRelayPromise
    ]);

    const isBalanceOKKarura = balanceKarura > BALANCE_LOW_THREASHOLD;
    const isBalanceOKAcala = balanceAcala > BALANCE_LOW_THREASHOLD;

    const isRunning = (
      shouldRelay.data?.shouldRelay === true &&
      shouldNotRelay.data?.shouldRelay === false
    );

    /* -------------------- is healthy -------------------- */
    let isHealthy = true;
    let msg = '';

    if (!isBalanceOKKarura || !isBalanceOKAcala) {
      isHealthy = false;
      msg = 'relayer balance too low';
    }

    if (!isRunning) {
      isHealthy = false;
      msg = '/shouldRelay endpoint is down';
    }

    response.status(200).json({
      isHealthy,
      isRunning,
      balanceKarura,
      balanceAcala,
      isBalanceOKKarura,
      isBalanceOKAcala,
      msg,
    });
  } catch (e) {
    console.log('error when checking health: ', e);

    response.status(400).json({
      isHealthy: false,
      msg: `error when checking health ${JSON.stringify(e)}`,
    });
  }
};
