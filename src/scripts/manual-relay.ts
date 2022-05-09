import { CHAIN_ID_KARURA } from '@certusone/wormhole-sdk';
import { ChainConfigInfo } from '../configureEnv';
import { relayEVM } from '../relay/utils';
import axios from 'axios';

const karuraChainConfig: ChainConfigInfo = {
  chainId: CHAIN_ID_KARURA,
  nodeUrl: 'ws://103.253.145.222:3331',
  substrateNodeUrl: 'ws://103.253.145.222:9947',
  tokenBridgeAddress: '0xd11De1f930eA1F7Dd0290Fe3a2e35b9C91AEFb37',
  bridgeAddress: undefined,
  walletPrivateKey: '0xefb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044',
};

const vaa = '01000000000100dcc241f8a3b9932715eb25599a82641a72620efcbcf016da44ccd0e6bb08f72c37fc93c8f343b984bf7388dd7e5b73d48add8ae578c4ea3c5ce060a50d0722ad01624d4b6a358800000002000000000000000000000000f890982f9310df57d00f659cf4fd87e65aded8d700000000000003130f01000000000000000000000000000000000000000000000000000000000000c35000000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f0002000000000000000000000000e3234f433914d4cfcf846491ec5a7831ab9f0bb3000b0000000000000000000000000000000000000000000000000000000000000000';

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

const manualRelayTxHash = async (txHash: string, rpcUrl: string) => {
  const receipt = (await axios.post(rpcUrl, {
    id: 0,
    jsonrpc: '2.0',
    method: 'eth_getTransactionReceipt',
    params: [txHash]
  })).data;

  console.log(receipt)
};



(async () => {
  // await manualRelayVAA(karuraChainConfig, vaa);

  const txHash = '0x6ae0bd05b7af34a8a84b738218609511d5aa248ba89a551b02b3af60e579799d';
  const karuraRpcUrl = 'https://mainnet.infura.io/v3/d5ce150a796d463397bf9f906fc1aae6';
  await manualRelayTxHash(txHash, karuraRpcUrl);
})();