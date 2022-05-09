import { fetchBalance } from '../relay/utils';

(async () => {
  const balance = await fetchBalance('0xfFFfd2fF9b840F6bd74f80DF8E532b4D7886FFFf', 'https://eth-rpc-karura.aca-api.network');
  console.log(balance);
})();
