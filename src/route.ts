import { CHAIN_ID_ETH, nativeToHexString } from '@certusone/wormhole-sdk';
import { Request, Response } from 'express';
import { ContractReceipt, Overrides, Signer } from 'ethers';
import { Factory__factory } from '@acala-network/asset-router';
import { WormholeInstructionsStruct, XcmInstructionsStruct } from '@acala-network/asset-router/dist/src/Factory';
import { getChainConfigInfo, ChainConfigInfo } from './configureEnv';
import { getRouterChainTokenAddr, getSigner, relayEVM } from './utils';
import { EvmRpcProvider } from '@acala-network/eth-providers';
import { ROUTE_SUPPORTED_CHAINS_AND_ASSETS } from './consts';

interface RouteParamsBase {
  routerChainId: string,  // acala or karura
  originAddr: string;     // origin token address
}

export interface RouteParamsWormhole extends RouteParamsBase {
  targetChainId: string;
  destAddr: string,       // recepient address
}

export interface RouteParamsXcm extends RouteParamsBase {
  destParaId: string;  // TODO: maybe can decode from dest
  dest: string,           // xcm encoded dest
}

export interface RelayAndRouteParams extends RouteParamsXcm {
  signedVAA: string,
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
  destParaId,
  routerChainId,
  originAddr,
}: RouteParamsXcm): Promise<RouteProps> => {
  const configByRouterChain = ROUTE_SUPPORTED_CHAINS_AND_ASSETS[routerChainId];
  if (!configByRouterChain) {
    throw new Error(`unsupported router chainId: ${routerChainId}`);
  }

  const supportedTokens = configByRouterChain[destParaId];
  if (!supportedTokens) {
    throw new Error(`unsupported dest parachain: ${destParaId}`);
  }

  if (!supportedTokens.includes(originAddr.toLowerCase())) {
    throw new Error(`unsupported token on dest parachin ${destParaId}. Token origin address: ${originAddr}`);
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

// const prepareRouteWormhole = async ({
//   destAddr,
//   routerChainId,
//   originAddr,
//   targetChainId,
// }: RouteParamsWormhole): Promise<RouteProps> => {
//   console.log({
//     destAddr,
//     routerChainId,
//     originAddr,
//     targetChainId,
//   });

//   if (Number(targetChainId) !== CHAIN_ID_ETH) {
//     throw new Error(`unsupported target chain: ${targetChainId}`);
//   }

//   const {
//     chainConfigInfo,
//     signer,
//     gasOverride,
//   } = await _prepareRoute(routerChainId);

//   const recipient = Buffer.from(nativeToHexString(destAddr, chainConfigInfo.chainId) as string, 'hex');
//   const wormholeInstructions: WormholeInstructionsStruct = {
//     recipientChain: targetChainId,
//     recipient,
//     nonce: 0,
//     arbiterFee: 0,
//   };

//   const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
//   // const routerChainTokenAddr = await getRouterChainTokenAddr(originAddr, chainConfigInfo);
//   const routerAddr = await factory.callStatic.deployWormholeRouter(
//     chainConfigInfo.feeAddr,
//     wormholeInstructions,
//     chainConfigInfo.tokenBridgeAddr,
//     gasOverride,
//   );

//   return {
//     routerAddr,
//     chainConfigInfo,
//     signer,
//     gasOverride,
//   };
// };

const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<ContractReceipt> => {
  console.log('routeXcm', routeParamsXcm);
  const { chainConfigInfo, signer, gasOverride } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfigInfo);
  console.log({ routerChainTokenAddr });
  const tx = await factory.connect(signer).deployXcmRouterAndRoute(
    chainConfigInfo.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
    gasOverride,
  );

  return tx.wait();
};

const relayAndRoute = async (params: RelayAndRouteParams): Promise<ContractReceipt> => {
  const { chainConfigInfo } = await _prepareRoute(params.routerChainId);

  const receipt = await relayEVM(chainConfigInfo, params.signedVAA);
  console.log(`relay finished: ${receipt.transactionHash}`);

  return routeXcm(params);
};

// const routeWormhole = async (routeParamsWormhole: RouteParamsWormhole): Promise<ContractReceipt> => {
//   const { chainConfigInfo, signer, gasOverride } = await prepareRouteWormhole(routeParamsWormhole);

//   const wormholeInstructions: WormholeInstructionsStruct = {
//     recipientChain: CHAIN_ID_ETH,
//     recipient: routeParamsWormhole.destAddr,
//     nonce: 0,
//     arbiterFee: 0,
//   };

//   const factory = Factory__factory.connect(chainConfigInfo.factoryAddr, signer);
//   const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsWormhole.originAddr, chainConfigInfo);
//   const tx = await factory.deployWormholeRouterAndRoute(
//     chainConfigInfo.feeAddr,
//     wormholeInstructions,
//     chainConfigInfo.tokenBridgeAddr,
//     routerChainTokenAddr,
//     gasOverride,
//   );
//   const receipt = await tx.wait();

//   return receipt;
// };

export const shouldRouteXcm = async (request: Request<any, any, any, RouteParamsXcm>, response: Response): Promise<void> =>  {
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

// export const shouldRouteWormhole = async (request: any, response: any): Promise<void> =>  {
//   const res = {
//     shouldRoute: true,
//     routerAddr: '0x',
//     msg: '',
//   };

//   try {
//     res.routerAddr = (await prepareRouteWormhole(request.query)).routerAddr;
//   } catch (error) {
//     console.log(error);
//     res.msg = error.message;
//     res.shouldRoute = false;
//   }

//   console.log(`shouldRouteWormhole: ${JSON.stringify({ ...request.query, ...res })}`);
//   response.status(200).json(res);
// };

export const handleRouteXcm = async (request: any, response: any): Promise<void> =>  {
  const receipt = await routeXcm(request.body);

  console.log(`routeXcm: ${JSON.stringify({ ...request.query, receipt })}`);
  response.status(200).json(receipt.transactionHash);
};

export const handleRelayAndRoute = async (request: Request<any, any, RelayAndRouteParams, any>, response: any): Promise<void> =>  {
  const receipt = await relayAndRoute(request.body);
  const txHash = receipt.transactionHash;

  console.log(`handleRelayAndRoute: ${JSON.stringify({ ...request.query, txHash })}`);
  response.status(200).json(txHash);
};

// export const handleRouteWormhole = async (request: any, response: any): Promise<void> =>  {
//   const receipt = await routeWormhole(request.query);
//   const txHash = receipt.transactionHash;

//   console.log(`routeXcm: ${JSON.stringify({ ...request.query, txHash })}`);
//   response.status(200).json(txHash);
// };
