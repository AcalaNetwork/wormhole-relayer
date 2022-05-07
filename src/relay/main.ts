import {
  ChainId,
  CHAIN_ID_ACALA,
  CHAIN_ID_KARURA,
  hexToUint8Array,
} from '@certusone/wormhole-sdk';
import axios from 'axios';
import { Wallet } from 'ethers';
import { RelayerEnvironment, validateEnvironment } from '../configureEnv';
import { BALANCE_LOW_THREASHOLD, RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS } from './consts';
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
    await relayEVM(
      chainConfigInfo,
      signedVAA,
      request,
      response
    );

    console.log(`Relay Succeed 🎉🎉: ${relayInfo}`);
  } catch (e) {
    console.log(`Relay Failed ❌: ${relayInfo}`);
    console.error(e);
    return response.status(500).json({ error: e, msg: 'Unable to relay this request.' });
  }
};

export const checkShouldRelay = (request: any, response: any): void =>  {
  const res = shouldRelay(request.query);

  console.log(`checkShouldRelay: ${JSON.stringify({ ...request.query, res: res.shouldRelay})}`);
  response.status(200).json(res);
};

export const health = async (request: any, response: any): Promise<void> => {
  const {
    KARURA_PRIVATE_KEY,
    ACALA_PRIVATE_KEY,
    KARURA_RPC_URL_HTTP,
    ACALA_RPC_URL_HTTP,
    PORT,
  } = process.env;

  try {
    /* -------------------- prepare requests -------------------- */
    const relayerAddressKarura = new Wallet(KARURA_PRIVATE_KEY).address;
    // const relayerAddressAcala = new Wallet(ACALA_PRIVATE_KEY).address;

    // const shouldRelayURL = `http://localhost:${PORT}/shouldRelay`;

    // const [tokenKarura, threasholdKarura] = Object.entries(RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[CHAIN_ID_KARURA])[0];
    // const [tokenAcala, threasholdAcala] = Object.entries(RELAYER_SUPPORTED_ADDRESSES_AND_THRESHOLDS[CHAIN_ID_ACALA])[0];

    // const shouldRelayPromiseKar = axios.get(shouldRelayURL, {
    //   params: {
    //     originAsset: tokenKarura,
    //     amount: threasholdKarura,
    //     targetChain: CHAIN_ID_KARURA,
    //   }
    // });

    // const shouldNotRelayPromiseKar = axios.get(shouldRelayURL, {
    //   params: {
    //     originAsset: tokenKarura,
    //     amount: 100,
    //     targetChain: CHAIN_ID_KARURA,
    //   }
    // });

    // const shouldRelayPromiseAca = axios.get(shouldRelayURL, {
    //   params: {
    //     originAsset: tokenAcala,
    //     amount: threasholdAcala,
    //     targetChain: CHAIN_ID_ACALA,
    //   }
    // });

    // const shouldNotRelayPromiseAca = axios.get(shouldRelayURL, {
    //   params: {
    //     originAsset: tokenAcala,
    //     amount: 100,
    //     targetChain: CHAIN_ID_ACALA,
    //   }
    // });

    /* -------------------- get all results -------------------- */
    const [
      balanceKarura,
      // balanceAcala,
      // shouldRelayKar,
      // shouldNotRelayKar,
      // shouldRelayAca,
      // shouldNotRelayAca,
    ] = await Promise.all([
      fetchBalance(relayerAddressKarura, KARURA_RPC_URL_HTTP),
      // fetchBalance(relayerAddressAcala, ACALA_RPC_URL_HTTP),
      // shouldRelayPromiseKar,
      // shouldNotRelayPromiseKar,
      // shouldRelayPromiseAca,
      // shouldNotRelayPromiseAca,
    ]);

    const isBalanceOKKarura = balanceKarura > BALANCE_LOW_THREASHOLD;
    // const isBalanceOKAcala = balanceAcala > BALANCE_LOW_THREASHOLD;

    // const isRunning = (
    //   shouldRelayKar.data?.shouldRelay === true &&
    //   shouldRelayAca.data?.shouldRelay === true &&
    //   shouldNotRelayKar.data?.shouldRelay === false
    //   shouldNotRelayAca.data?.shouldRelay === false
    // );

    /* -------------------- is healthy -------------------- */
    let isHealthy = true;
    let msg = '';

    if (!isBalanceOKKarura) {
      isHealthy = false;
      msg = 'relayer balance too low';
    }

    // if (!isRunning) {
    //   isHealthy = false;
    //   msg = '/shouldRelay endpoint is down';
    // }

    response.status(200).json({
      isHealthy,
      // isRunning,
      balanceKarura,
      // balanceAcala,
      isBalanceOKKarura,
      // isBalanceOKAcala,
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
