import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { ChainID } from '@certusone/wormhole-sdk/lib/cjs/proto/publicrpc/v1/publicrpc';
import axios from 'axios';
import { ChainConfigInfo } from '../configureEnv';
import { relayEVM } from '../relay/utils';

// const KARURA_ETH_RPC_URL='https://eth-rpc-karura-testnet.aca-staging.network';
// const ACALA_ETH_RPC_URL='https://eth-rpc-acala-testnet.aca-staging.network';
// const KARURA_SUBSTRATE_NODE_URL='wss://karura-dev.aca-dev.network/rpc/ws';
// const ACALA_SUBSTRATE_NODE_URL='wss://acala-dev.aca-dev.network/rpc/ws';

// const karuraChainConfig: ChainConfigInfo = {
//   chainId: CHAIN_ID_KARURA,
//   // nodeUrl: 'ws://103.253.145.222:3331',
//   nodeUrl: undefined,
//   substrateNodeUrl: KARURA_SUBSTRATE_NODE_URL,
//   tokenBridgeAddress: '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37',
//   walletPrivateKey: '0xefb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044',
// };

const manualRelayVAA = async (relayerUrl: string, targetChain: ChainID, signedVAA: string) => {
  try {
    const res = await axios.post(`${relayerUrl}/relay`, {
      targetChain: CHAIN_ID_KARURA,
      signedVAA,
    });
    // const receipt = await relayEVM(chainConfigInfo, signedVAA);

    console.log(`
      ---------------------------------------
      ---------- Relay Succeed 🎉🎉 ----------
      ---------------------------------------
    `);

    console.log(res.data);

  } catch (e) {
    console.log(`
      -------------------------------------
      ---------- Relay Failed ❌ ----------
      -------------------------------------
    `);

    console.error(e);
  }
};

(async () => {
  const relayerUrl = 'http://localhost:3111';
  const vaa = '010000000001000e728dc328a104bfd405af83768ffb09fc178c23850595fd62329f0ce6a8c5ff74f08ffb8a50119990302599722eb1dbb66a4c0f67aaf38c8518bf9b1a928b32006336aec84a8d000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a0900000000000007260f010000000000000000000000000000000000000000000000000000000000989680000000000000000000000000337610d27c682e347c9cd60bd4b3b107c9d34ddd0004000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000';

  await manualRelayVAA(relayerUrl, CHAIN_ID_KARURA, vaa);
})();