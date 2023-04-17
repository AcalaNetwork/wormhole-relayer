import { ChainId, tryNativeToHexString } from '@certusone/wormhole-sdk';
import { Request, Response } from 'express';
import { ContractReceipt, Overrides, Signer } from 'ethers';
import { Factory__factory } from '@acala-network/asset-router';
import { WormholeInstructionsStruct, XcmInstructionsStruct } from '@acala-network/asset-router/dist/src/Factory';
import { getChainConfigInfo, ChainConfigInfo } from './configureEnv';
import { getRouterChainTokenAddr, getSigner, relayEVM } from './utils';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { RouterChainIdByDestParaId, ROUTE_SUPPORTED_CHAINS_AND_ASSETS, ZERO_ADDR } from './consts';

interface RouteParamsBase {
  originAddr: string;     // origin token address
}

export interface RouteParamsWormhole extends RouteParamsBase {
  targetChainId: string;
  destAddr: string;       // recepient address in hex
  fromParaId: string;     // from parachain id in number
}

export interface RouteParamsXcm extends RouteParamsBase {
  destParaId: string;  // TODO: maybe can decode from dest
  dest: string;           // xcm encoded dest in hex
}

export interface RelayAndRouteParams extends RouteParamsXcm {
  signedVAA: string;
}

interface RouteProps {
  routerAddr: string;
  chainConfigInfo: ChainConfigInfo;
  signer: Signer;
  gasOverride: Overrides;
}

interface RoutePropsXcm extends RouteProps {
  routerChainId: ChainId;
}

interface RoutePropsWormhole extends RouteProps {
  routerChainTokenAddr: string;
  wormholeInstructions: WormholeInstructionsStruct;
}

const _prepareRoute = async (routerChainId: ChainId) => {
  const chainConfigInfo = getChainConfigInfo(routerChainId);
  if (!chainConfigInfo) {
    throw new Error(`unsupported routerChainId: ${routerChainId}`);
  }

  const signer = await getSigner(chainConfigInfo);
  const gasOverride = await (signer.provider as EvmRpcProvider)._getEthGas();

  return {
    chainConfigInfo,
    signer,
    gasOverride,
  };
};

const prepareRouteXcm = async ({
  dest,
  destParaId,
  originAddr,
}: RouteParamsXcm): Promise<RoutePropsXcm> => {
  const supportedTokens = ROUTE_SUPPORTED_CHAINS_AND_ASSETS[destParaId];
  if (!supportedTokens) {
    throw new Error(`unsupported dest parachain: ${destParaId}`);
  }

  if (!supportedTokens.includes(originAddr.toLowerCase())) {
    throw new Error(`unsupported token on dest parachin ${destParaId}. Token origin address: ${originAddr}`);
  }

  const routerChainId = RouterChainIdByDestParaId[destParaId] as ChainId;
  const {
    chainConfigInfo,
    signer,
    gasOverride,
  } = await _prepareRoute(routerChainId);

  const weight = '0x00';    // unlimited
  const xcmInstruction = { dest, weight };

  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployXcmRouter(chainConfigInfo.feeAddr, xcmInstruction, gasOverride);

  return {
    routerAddr,
    chainConfigInfo,
    signer,
    gasOverride,
    routerChainId,
  };
};

const prepareRouteWormhole = async ({
  originAddr,
  destAddr,
  fromParaId,
  targetChainId,
}: RouteParamsWormhole): Promise<RoutePropsWormhole> => {
  const routerChainId = RouterChainIdByDestParaId[fromParaId];
  if (!routerChainId) {
    throw new Error(`unsupported origin parachain: ${fromParaId}`);
  }

  const {
    chainConfigInfo,
    signer,
    gasOverride,
  } = await _prepareRoute(routerChainId);

  const routerChainTokenAddr = await getRouterChainTokenAddr(originAddr, chainConfigInfo);
  if (routerChainTokenAddr === ZERO_ADDR) {
    throw new Error(`origin token ${originAddr} not supported on router chain ${routerChainId}`);
  }

  const recipient = Buffer.from(tryNativeToHexString(destAddr, chainConfigInfo.chainId), 'hex');
  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: targetChainId,
    recipient,
    nonce: 0,
    arbiterFee: 0,
  };

  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployWormholeRouter(
    chainConfigInfo.feeAddr,
    wormholeInstructions,
    chainConfigInfo.tokenBridgeAddr,
    gasOverride,
  );

  return {
    routerAddr,
    chainConfigInfo,
    signer,
    gasOverride,
    routerChainTokenAddr,
    wormholeInstructions,
  };
};

const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<ContractReceipt> => {
  console.log('routeXcm:', routeParamsXcm);
  const { chainConfigInfo, signer, gasOverride } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfigInfo);

  const tx = await factory.connect(signer).deployXcmRouterAndRoute(
    chainConfigInfo.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
    gasOverride,
  );

  return tx.wait();
};

const relayAndRoute = async (params: RelayAndRouteParams): Promise<[ContractReceipt, ContractReceipt]> => {
  const routerChainId = RouterChainIdByDestParaId[params.destParaId] as ChainId;
  const { chainConfigInfo } = await _prepareRoute(routerChainId);

  const wormholeReceipt = await relayEVM(chainConfigInfo, params.signedVAA);
  console.log(`relay finished: ${wormholeReceipt.transactionHash}`);

  const xcmReceipt = await routeXcm(params);
  return [wormholeReceipt, xcmReceipt];
};

const routeWormhole = async (routeParamsWormhole: RouteParamsWormhole): Promise<ContractReceipt> => {
  const {
    chainConfigInfo,
    signer,
    gasOverride,
    routerChainTokenAddr,
    wormholeInstructions,
  } = await prepareRouteWormhole(routeParamsWormhole);

  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const tx = await factory.deployWormholeRouterAndRoute(
    chainConfigInfo.feeAddr,
    wormholeInstructions,
    chainConfigInfo.tokenBridgeAddr,
    routerChainTokenAddr,
    gasOverride,
  );
  const receipt = await tx.wait();

  return receipt;
};

export const shouldRouteXcm = async (request: Request<any, any, any, RouteParamsXcm>, response: Response): Promise<void> =>  {
  const res = {
    shouldRoute: true,
    routerAddr: '0x',
    routerChainId: -1,
    msg: '',
  };

  try {
    const shouldRouteRes = await prepareRouteXcm(request.query);
    res.routerAddr = shouldRouteRes.routerAddr;
    res.routerChainId = shouldRouteRes.routerChainId;
  } catch (error) {
    console.log(error);
    res.msg = error.message;
    res.shouldRoute = false;
  }

  console.log(`shouldRouteXcm: ${JSON.stringify({ ...request.query, res })}`);
  response.status(200).json(res);
};

export const shouldRouteWormhole = async (request: any, response: any): Promise<void> =>  {
  const res = {
    shouldRoute: true,
    routerAddr: '0x',
    msg: '',
  };

  try {
    res.routerAddr = (await prepareRouteWormhole(request.query)).routerAddr;
  } catch (error) {
    console.log(error);
    res.msg = error.message;
    res.shouldRoute = false;
  }

  console.log(`shouldRouteWormhole: ${JSON.stringify({ ...request.query, ...res })}`);
  response.status(200).json(res);
};

export const handleRouteXcm = async (request: any, response: any): Promise<void> =>  {
  const receipt = await routeXcm(request.body);

  console.log(`routeXcm: ${JSON.stringify({ ...request.query, receipt })}`);
  response.status(200).json(receipt.transactionHash);
};

export const handleRelayAndRoute = async (request: Request<any, any, RelayAndRouteParams, any>, response: any): Promise<void> =>  {
  const receipts = await relayAndRoute(request.body);
  const txHashes = receipts.map(r => r.transactionHash);

  console.log(`handleRelayAndRoute: ${JSON.stringify({ ...request.query, txHashes })}`);
  response.status(200).json(txHashes);
};

export const handleRouteWormhole = async (request: any, response: any): Promise<void> =>  {
  const receipt = await routeWormhole(request.body);
  const txHash = receipt.transactionHash;

  console.log(`routeXcm: ${JSON.stringify({ ...request.query, txHash })}`);
  response.status(200).json(txHash);
};
