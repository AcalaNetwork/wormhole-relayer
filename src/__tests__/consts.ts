import { Wallet } from 'ethers';

export const ETH_RPC_BSC = 'https://endpoints.omniatech.io/v1/bsc/testnet/public';
// export const ETH_RPC_BSC = 'https://bsc-testnet.public.blastapi.io';
export const ETH_RPC_GOERLI = 'https://rpc.ankr.com/eth_goerli';
export const BASILISK_TESTNET_NODE_URL = 'wss://karura-testnet.aca-staging.network/rpc/basilisk/ws';

export const TEST_USER_PRIVATE_KEY = '01392cd1a09fc0f4857742f0f0daa3ebd5a0f44a7dab48c23ccd331717b97b10';
export const TEST_USER_ADDR = new Wallet(TEST_USER_PRIVATE_KEY).address;  // 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
export const TEST_RELAYER_ADDR = '0xe3234f433914d4cfCF846491EC5a7831ab9f0bb3';

export const BSC_CORE_BRIDGE_ADDRESS = '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D';
export const GOERLI_CORE_BRIDGE_ADDRESS = '0x706abc4E45D419950511e474C7B9Ed348A4a716c';
export const KARURA_CORE_BRIDGE_ADDRESS = '0xE4eacc10990ba3308DdCC72d985f2a27D20c7d03';

export const BSC_TOKEN_BRIDGE_ADDRESS = '0x9dcF9D205C9De35334D646BeE44b2D2859712A09';
export const GOERLI_TOKEN_BRIDGE_ADDRESS = '0xF890982f9310df57d00f659cf4fd87e65adEd8d7';
export const KARURA_TOKEN_BRIDGE_ADDRESS = '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37';

export const BSC_USDT_ADDRESS = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';
export const BSC_USDC_ADDRESS = '0x861B5C16A2EcED022241072A7beA9D530b99EB6f';
export const KARURA_USDC_ADDRESS = '0xE5BA1e8E6BBbdC8BbC72A58d68E74B13FcD6e4c7';
export const GOERLI_USDC_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F';
export const NOT_SUPPORTED_ADDRESS = '';

const RELAYER_URL = 'http://localhost:3111';
// const RELAYER_URL = 'https://relayer.aca-dev.network';
export const RELAYER_URL_TESTNET = 'https://karura-dev.aca-dev.network/eth/relayer';

export const RELAY_URL = `${RELAYER_URL}/relay`;
export const SHOULD_RELAY_URL = `${RELAYER_URL}/shouldRelay`;
export const SHOULD_ROUTE_XCM_URL = `${RELAYER_URL}/shouldRouteXcm`;
export const SHOULD_ROUTE_WORMHOLE_URL = `${RELAYER_URL}/shouldRouteWormhole`;

export const ROUTE_XCM_URL = `${RELAYER_URL}/routeXcm`;
export const ROUTE_WORMHOLE_URL = `${RELAYER_URL}/routeWormhole`;
export const RELAY_AND_ROUTE_URL = `${RELAYER_URL}/relayAndRoute`;

export const WORMHOLE_GUARDIAN_RPC = ['https://wormhole-v2-testnet-api.certus.one'];
