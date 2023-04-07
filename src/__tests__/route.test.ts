import { EvmRpcProvider } from '@acala-network/eth-providers';
import { ERC20__factory } from '@certusone/wormhole-sdk';
import axios from 'axios';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { after, before } from 'mocha';
import { BSC_USDC_ADDRESS, ROUTE_XCM_URL, SHOULD_ROUTE_XCM_URL, ETH_RPC_BSC, KARURA_USDC_ADDRESS } from './consts';

const KARURA_NODE_URL = 'wss://karura-testnet.aca-staging.network/rpc/karura/ws';
// const KARURA_NODE_URL = 'ws://localhost:8000';
const TEST_KEY = 'efb03e3f4fd8b3d7f9b14de6c6fb95044e2321d6bcb9dfe287ba987920254044';

const mockXcmToRouter = async (routerAddr: string, signer: Wallet) => {
  const usdc = new ERC20__factory(signer).attach(KARURA_USDC_ADDRESS);

  expect((await usdc.balanceOf(routerAddr)).toNumber()).to.eq(0);

  const ROUTE_AMOUNT = 0.01;
  const routeAmount = parseUnits(String(ROUTE_AMOUNT), 6);
  await (await usdc.transfer(routerAddr, routeAmount)).wait();

  expect((await usdc.balanceOf(routerAddr)).toBigInt()).to.eq(routeAmount.toBigInt());
};

describe('/routeXcm', () => {
  const shouldRouteXcm = (params: any) => axios.get(SHOULD_ROUTE_XCM_URL, { params });
  const routeXcm = (params: any) => axios.post(ROUTE_XCM_URL, params);

  const dest = '0x03010200a9200100d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';

  const provider = new EvmRpcProvider(KARURA_NODE_URL);

  after(async () => {
    await provider.disconnect();
  });

  before(async () => {
    await provider.isReady();
  });

  it('when should route', async () => {
    const routeArgs = {
      dest,
      routerChainId: 11,
      targetChain: 'BASILISK',
      originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    };

    const res = await shouldRouteXcm(routeArgs);
    const { routerAddr } = res.data;

    console.log('xcming to router ...');
    const signer = new Wallet(TEST_KEY, provider);
    await mockXcmToRouter(routerAddr, signer);

    console.log('routing ...');
    const routeRes = await routeXcm(routeArgs);
    console.log(`route finished! txHash: ${routeRes.data}`);

    await provider.disconnect();
  });

  describe.skip('when should not route', () => {
    it('when missing params', async () => {
      let res = await routeXcm({
        routerChainId: 11,
        targetChain: 'BASILISK',
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('dest is a required field');

      res = await routeXcm({
        dest,
        targetChain: 'BASILISK',
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('routerChainId is a required field');

      res = await routeXcm({
        dest,
        routerChainId: 11,
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('targetChain is a required field');

      res = await routeXcm({
        dest,
        routerChainId: 11,
        targetChain: 'BASILISK',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('originAddr is a required field');
    });

    it('when wrong params', async () => {
      const validArgs = {
        dest,
        routerChainId: 11,
        targetChain: 'BASILISK',
        originAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
      };

      let res = await routeXcm({
        ...validArgs,
        routerChainId: 8,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('unsupported router chainId: 8');

      res = await routeXcm({
        ...validArgs,
        targetChain: 'COSMOS',
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain('unsupported target chain: COSMOS');

      const unsupportedToken = '0x07865c6e87b9f70255377e024ace6630c1e00000';
      res = await routeXcm({
        ...validArgs,
        originAddr: unsupportedToken,
      });
      expect(res.data.shouldRoute).to.equal(false);
      expect(res.data.msg).to.contain(`unsupported token on BASILISK. Token origin address: ${unsupportedToken}`);

      // TODO: need to validate dest?
      // res = await routeXcm({
      //   ...validArgs,
      //   dest: '0xabcd'
      // });
      // expect(res.data.shouldRoute).to.equal(false);
      // expect(res.data.msg).to.contain('unsupported router chainId: 8');
    });
  });
});

