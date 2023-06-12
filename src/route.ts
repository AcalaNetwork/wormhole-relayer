import { ChainId, hexToUint8Array, tryNativeToHexString } from '@certusone/wormhole-sdk';
import { BigNumber, Signer } from 'ethers';
import { ERC20__factory, Factory__factory, FeeRegistry__factory } from '@acala-network/asset-router/dist/typechain-types';
import { WormholeInstructionsStruct, XcmInstructionsStruct } from '@acala-network/asset-router/dist/typechain-types/src/Factory';
import { Bridge__factory } from '@certusone/wormhole-sdk/lib/cjs/ethers-contracts';

import { getChainConfig, ChainConfig } from './configureEnv';
import { getRouterChainTokenAddr, getSigner, parseVaaPayload, relayEVM } from './utils';
import { RouterChainIdByDestParaId, ROUTE_SUPPORTED_CHAINS_AND_ASSETS, ZERO_ADDR } from './consts';
import { logger } from './logger';
import { RelayError } from './middlewares/error';

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
  chainConfig: ChainConfig;
  signer: Signer;
}

interface RoutePropsXcm extends RouteProps {
  routerChainId: ChainId;
}

interface RoutePropsWormhole extends RouteProps {
  routerChainTokenAddr: string;
  wormholeInstructions: WormholeInstructionsStruct;
}

const _prepareRoute = async (routerChainId: ChainId) => {
  const chainConfig = getChainConfig(routerChainId);
  if (!chainConfig) {
    throw new Error(`unsupported routerChainId: ${routerChainId}`);
  }

  const signer = await getSigner(chainConfig);

  return {
    chainConfig,
    signer,
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
    chainConfig,
    signer,
  } = await _prepareRoute(routerChainId);

  const weight = '0x00';    // unlimited
  const xcmInstruction = { dest, weight };

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployXcmRouter(chainConfig.feeAddr, xcmInstruction);

  return {
    routerAddr,
    chainConfig,
    signer,
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
    chainConfig,
    signer,
  } = await _prepareRoute(routerChainId);

  const routerChainTokenAddr = await getRouterChainTokenAddr(originAddr, chainConfig);
  if (routerChainTokenAddr === ZERO_ADDR) {
    throw new Error(`origin token ${originAddr} not supported on router chain ${routerChainId}`);
  }

  const recipient = Buffer.from(tryNativeToHexString(destAddr, chainConfig.chainId), 'hex');
  const wormholeInstructions: WormholeInstructionsStruct = {
    recipientChain: targetChainId,
    recipient,
    nonce: 0,
    arbiterFee: 0,
  };

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerAddr = await factory.callStatic.deployWormholeRouter(
    chainConfig.feeAddr,
    wormholeInstructions,
    chainConfig.tokenBridgeAddr,
  );

  return {
    routerAddr,
    chainConfig,
    signer,
    routerChainTokenAddr,
    wormholeInstructions,
  };
};

export const routeXcm = async (routeParamsXcm: RouteParamsXcm): Promise<string> => {
  const { chainConfig, signer } = await prepareRouteXcm(routeParamsXcm);

  const xcmInstruction: XcmInstructionsStruct = {
    dest: routeParamsXcm.dest,
    weight: '0x00',
  };
  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const routerChainTokenAddr = await getRouterChainTokenAddr(routeParamsXcm.originAddr, chainConfig);

  const tx = await factory.connect(signer).deployXcmRouterAndRoute(
    chainConfig.feeAddr,
    xcmInstruction,
    routerChainTokenAddr,
  );

  const receipt = await tx.wait();

  return receipt.transactionHash;
};

const VAA_MIN_DECIMALS = 8;
export const relayAndRoute = async (params: RelayAndRouteParams): Promise<[string, string]> => {
  const routerChainId = RouterChainIdByDestParaId[params.destParaId] as ChainId;
  const { chainConfig, signer } = await _prepareRoute(routerChainId);

  const tokenBridge = Bridge__factory.connect(chainConfig.tokenBridgeAddr, signer);
  const feeRegistry = FeeRegistry__factory.connect(chainConfig.feeAddr, signer);

  const vaaInfo = await parseVaaPayload(hexToUint8Array(params.signedVAA));
  const {
    originAddress,
    amount,     // min(originAssetDecimal, 8)
    originChain,
  } = vaaInfo;

  const wrappedAddr = await tokenBridge.wrappedAsset(
    originChain,
    Buffer.from(tryNativeToHexString(originAddress, originChain), 'hex'),
  );

  const fee = await feeRegistry.getFee(wrappedAddr);
  if (fee.eq(0)) {
    throw new RelayError('unsupported token', { ...vaaInfo });
  }

  const erc20 = ERC20__factory.connect(wrappedAddr, signer);
  const decimals = await erc20.decimals();
  const realAmount = decimals <= VAA_MIN_DECIMALS
    ? amount
    : BigNumber.from(amount).pow(decimals - VAA_MIN_DECIMALS);

  if (fee.gt(realAmount)) {
    throw new RelayError('token amount too small to relay', vaaInfo);
  }

  const wormholeReceipt = await relayEVM(chainConfig, params.signedVAA);
  logger.debug({ txHash: wormholeReceipt.transactionHash }, 'relay finished');

  const xcmTxHash = await routeXcm(params);
  return [wormholeReceipt.transactionHash, xcmTxHash];
};

export const routeWormhole = async (routeParamsWormhole: RouteParamsWormhole): Promise<string> => {
  const {
    chainConfig,
    signer,
    routerChainTokenAddr,
    wormholeInstructions,
  } = await prepareRouteWormhole(routeParamsWormhole);

  const factory = Factory__factory.connect(chainConfig.factoryAddr, signer);
  const tx = await factory.deployWormholeRouterAndRoute(
    chainConfig.feeAddr,
    wormholeInstructions,
    chainConfig.tokenBridgeAddr,
    routerChainTokenAddr,
  );
  const receipt = await tx.wait();

  return receipt.transactionHash;
};

export const shouldRouteXcm = async (data: any) =>  {
  try {
    const { routerAddr, routerChainId } = await prepareRouteXcm(data);
    return {
      shouldRoute: true,
      routerAddr,
      routerChainId,
    };
  } catch (error) {
    return {
      shouldRoute: false,
      msg: error.message,
    };
  }
};

export const shouldRouteWormhole = async (data: any) =>  {
  try {
    const { routerAddr } = await prepareRouteWormhole(data);
    return {
      shouldRoute: true,
      routerAddr,
    };
  } catch (error) {
    return {
      shouldRoute: false,
      msg: error.message,
    };
  }
};
