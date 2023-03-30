import { CHAIN_ID_ETH } from '@certusone/wormhole-sdk';
import { ContractReceipt, Overrides, Signer } from 'ethers';
import { getChainConfigInfo, ChainConfigInfo } from './configureEnv';
import { XcmInstructionsStruct } from './typechain-types/src/XcmRouter';
import { getRouterChainTokenAddr, getSigner } from './utils';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { WormholeInstructionsStruct } from './typechain-types/src/Factory';
import { Factory__factory } from './typechain-types';
import { ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from './consts';

interface baseRouteArgs {
  routerChainId: string,  // acala or karura
  originAddr: string;     // origin token address
  destAddr: string,       // recepient address
}

interface RouteArgsWormhole extends baseRouteArgs {
  targetChainId: string;
}

interface RouteArgsXcm extends baseRouteArgs {
  targetChain: string;
}

interface RouteProps {
  routerAddr: string;
  chainConfigInfo: ChainConfigInfo;
  signer: Signer;
  gasOverride: Overrides;
}

const _prepareRoute = async (routerChainId: number | string) => {
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
  destAddr,
  routerChainId,
  targetChain,
  originAddr,
}: RouteArgsXcm): Promise<RouteProps> => {
  const supportedTokens = ROUTE_SUPPORTED_CHAINS_AND_ASSETS[targetChain];
  if (!supportedTokens) {
    throw new Error(`Unsupported target chain: ${targetChain}`);
  }

  if (!supportedTokens.includes(originAddr)) {
    throw new Error(`Unsupported token on ${targetChain}. Token Origin Address: ${originAddr}`);
  }

  const {
    chainConfigInfo,
    signer,
    gasOverride,
  } = await _prepareRoute(routerChainId);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: destAddr,
    weight: '0x00',
  };
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
  // TODO: check chainid is valid

  const {
    chainConfigInfo,
    signer,
    gasOverride,
  } = await _prepareRoute(routerChainId);

  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: targetChainId,
    recipient: destAddr,
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
    dest: routeArgsXcm.destAddr,
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

export const shouldRouteXcm = async (request: any, response: any): Promise<void> =>  {
  const res = {
    shouldRoute: true,
    routerAddr: '0x',
    msg: '',
  };

  try {
    res.routerAddr = (await prepareRouteXcm(request.query)).routerAddr;
  } catch (error) {
    console.log(error)
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
    console.log(error)
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
