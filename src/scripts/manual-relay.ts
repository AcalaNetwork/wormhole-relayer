import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { ChainConfigInfo } from '../configureEnv';
import { relayEVM } from '../relay/utils';

const karuraChainConfig: ChainConfigInfo = {
  chainId: CHAIN_ID_KARURA,
  nodeUrl: 'ws://103.253.145.222:3331',
  substrateNodeUrl: 'ws://103.253.145.222:9947',
  tokenBridgeAddress: '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37',
  bridgeAddress: undefined,
  walletPrivateKey: '0xefb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044',
};

const vaa = '01000000000100f69ad505b4731c19dc38911853a251ece6848c3e127488d24bdeacf7032b0f2d57495fb42627e5cfa1e6dbec779e5335c4b6fdac0e719855fb4382a4fa8602b100622a2e028b4e000000040000000000000000000000009dcf9d205c9de35334d646bee44b2d2859712a09000000000000010b0f0100000000000000000000000000000000000000000000000000000000004c4b40000000000000000000000000337610d27c682e347c9cd60bd4b3b107c9d34ddd0004000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000';

const manualRelayVAA = async (chainConfigInfo: ChainConfigInfo, signedVAA: string) => {
  let r;
  const res = new Promise(resolve => r = resolve);

  const response = {
    status: () => ({
      json: r,
    })
  };

  try {
    await relayEVM(chainConfigInfo, signedVAA, null, response);

    console.log(`
      ---------------------------------------
      ---------- Relay Succeed 🎉🎉 ----------
      ---------------------------------------
    `);

    console.log(res);
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
  await manualRelayVAA(karuraChainConfig, vaa);
})();