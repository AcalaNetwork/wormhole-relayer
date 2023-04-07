import { CHAIN_ID_ETH, nativeToHexString } from '@certusone/wormhole-sdk';
import { Request, Response, NextFunction } from 'express';
import { ContractReceipt, Overrides, Signer } from 'ethers';
import { getChainConfigInfo, ChainConfigInfo } from './configureEnv';
import { XcmInstructionsStruct } from './typechain-types/src/XcmRouter';
import { getRouterChainTokenAddr, getSigner } from './utils';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { WormholeInstructionsStruct } from './typechain-types/src/Factory';
import { Factory__factory } from './typechain-types';
import { ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from './consts';
import { ChainID } from '@certusone/wormhole-sdk/lib/cjs/proto/publicrpc/v1/publicrpc';

interface baseRouteArgs {
  routerChainId: string,  // acala or karura
  originAddr: string;     // origin token address
}

export interface RouteArgsWormhole extends baseRouteArgs {
  targetChainId: string;
  destAddr: string,       // recepient address
}

export interface RouteArgsXcm extends baseRouteArgs {
  targetChain: string;
  dest: string,       // xcm encoded dest
}

interface RouteProps {
  routerAddr: string;
  chainConfigInfo: ChainConfigInfo;
  signer: Signer;
  gasOverride: Overrides;
}

const _prepareRoute = async (routerChainId: string) => {
  const chainConfigInfo = getChainConfigInfo(Number(routerChainId));
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
  routerChainId,
  targetChain,
  originAddr,
}: RouteArgsXcm): Promise<RouteProps> => {
  const configByRouterChain = ROUTE_SUPPORTED_CHAINS_AND_ASSETS[routerChainId];
  if (!configByRouterChain) {
    throw new Error(`unsupported router chainId: ${routerChainId}`);
  }

  const supportedTokens = configByRouterChain[targetChain];
  if (!supportedTokens) {
    throw new Error(`unsupported target chain: ${targetChain}`);
  }

  if (!supportedTokens.includes(originAddr.toLowerCase())) {
    throw new Error(`unsupported token on ${targetChain}. Token origin address: ${originAddr}`);
  }

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
  };
};

const prepareRouteWormhole = async ({
  destAddr,
  routerChainId,
  originAddr,
  targetChainId,
}: RouteArgsWormhole): Promise<RouteProps> => {
  console.log({
    destAddr,
    routerChainId,
    originAddr,
    targetChainId,
  });

  if (Number(targetChainId) !== CHAIN_ID_ETH) {
    throw new Error(`unsupported target chain: ${targetChainId}`);
  }

  const {
    chainConfigInfo,
    signer,
    gasOverride,
  } = await _prepareRoute(routerChainId);

  const recipient = Buffer.from(nativeToHexString(destAddr, chainConfigInfo.chainId) as string, 'hex');
  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: targetChainId,
    recipient,
    nonce: 0,
    arbiterFee: 0,
  };

  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  // const routerChainTokenAddr = await getRouterChainTokenAddr(originAddr, chainConfigInfo);
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
  };
};

const routeXcm = async (routeArgsXcm: RouteArgsXcm): Promise<ContractReceipt> => {
  const { chainConfigInfo, signer, gasOverride } = await prepareRouteXcm(routeArgsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeArgsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeArgsXcm.originAddr, chainConfigInfo);
  const tx = await factory.connect(signer).deployXcmRouterAndRoute(
    chainConfigInfo.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
    gasOverride,
  );

  return tx.wait();
};

const routeWormhole = async (routeArgsWormhole: RouteArgsWormhole): Promise<ContractReceipt> => {
  const { chainConfigInfo, signer, gasOverride } = await prepareRouteWormhole(routeArgsWormhole);

  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: CHAIN_ID_ETH,
    recipient: routeArgsWormhole.destAddr,
    nonce: 0,
    arbiterFee: 0,
  };

  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeArgsWormhole.originAddr, chainConfigInfo);
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

export const shouldRouteXcm = async (request: Request<any, any, any, RouteArgsXcm>, response: Response): Promise<void> =>  {
  const res = {
    shouldRoute: true,
    routerAddr: '0x',
    msg: '',
  };

  try {
    res.routerAddr = (await prepareRouteXcm(request.query)).routerAddr;
  } catch (error) {
    console.log(error);
    res.msg = error.message;
    res.shouldRoute = false;
  }

  console.log(`shouldRouteXcm: ${JSON.stringify({ ...request.query, ...res })}`);
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
  const receipt = await routeXcm(request.query);

  console.log(`routeXcm: ${JSON.stringify({ ...request.query, receipt })}`);
  response.status(200).json(receipt);
};

export const handleRouteWormhole = async (request: any, response: any): Promise<void> =>  {
  const receipt = await routeWormhole(request.query);

  console.log(`routeXcm: ${JSON.stringify({ ...request.query, receipt })}`);
  response.status(200).json(receipt);
};
