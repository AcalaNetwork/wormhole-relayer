import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { Wallet } from 'ethers';
import { HEALTH_URL,  } from './consts';
import { fetchBalance } from '../relay/utils';

dotenv.config({ path: '.env' });
const {
  KARURA_PRIVATE_KEY,
  ACALA_PRIVATE_KEY,
  KARURA_RPC_URL_HTTP,
  ACALA_RPC_URL_HTTP,
} = process.env;

const relayerAddressKarura = new Wallet(KARURA_PRIVATE_KEY).address;
const relayerAddressAcala = new Wallet(ACALA_PRIVATE_KEY).address;

describe('fetchBalance', () => {
  it('should fetch correct balance', async () => {
    const DUMMY = '0x29d7d1dd5b6f9c864d9db560d72a247c178ae86c';

    expect(await fetchBalance(DUMMY, KARURA_RPC_URL_HTTP)).to.equal(0);
    expect(await fetchBalance(DUMMY, ACALA_RPC_URL_HTTP)).to.equal(0);

    expect(await fetchBalance(relayerAddressKarura, KARURA_RPC_URL_HTTP)).to.greaterThan(0);
    expect(await fetchBalance(relayerAddressAcala, ACALA_RPC_URL_HTTP)).to.greaterThan(0);
  });
});

describe('/health', () => {
  it('when healthy', async () => {
    const [
      balanceKarura,
      balanceAcala,
      healthCheck
    ] = await Promise.all([
      fetchBalance(relayerAddressKarura, KARURA_RPC_URL_HTTP),
      fetchBalance(relayerAddressAcala, ACALA_RPC_URL_HTTP),
      axios.get(HEALTH_URL, {}),
    ]);

    expect(healthCheck.data).to.deep.equal({
      isHealthy: true,
      isRunning: true,
      isBalanceOKKarura: true,
      isBalanceOKAcala: true,
      balanceKarura,
      balanceAcala,
      msg: '',
    });
  });

  // need to manually change env to poor accounts `1570b994d8c79a9b10a8c5cd577c7fdb2b9461d01f7e84a0e07693212488a7ab`
  it.skip('when balance low', async () => {
    const healthCheck = await axios.get(HEALTH_URL, {});

    expect(healthCheck.data).to.deep.equal({
      isHealthy: false,
      isRunning: true,
      isBalanceOKKarura: false,
      isBalanceOKAcala: false,
      balanceKarura: 7.888540373466,
      balanceAcala: 14.995946871269,
      msg: 'relayer balance too low',
    });
  });
});
