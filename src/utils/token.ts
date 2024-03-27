import { BigNumber, Signer } from 'ethers';
import { ERC20__factory } from '@acala-network/asset-router/dist/typechain-types';
import { Provider } from '@ethersproject/abstract-provider';
import { formatUnits, parseUnits } from 'ethers/lib/utils';

export const parseAmount = async (
  tokenAddr: string,
  amount: string,
  signerOrProvider: Signer | Provider,
): Promise<BigNumber> => {
  const token = ERC20__factory.connect(tokenAddr, signerOrProvider);
  const decimals = await token.decimals();

  return parseUnits(amount, decimals);
};

export const getTokenBalance = async (
  tokenAddr: string,
  signer: Signer,
): Promise<string> => {
  const token = ERC20__factory.connect(tokenAddr, signer);

  const [bal, decimals] = await Promise.all([
    token.balanceOf(await signer.getAddress()),
    token.decimals(),
  ]);

  return formatUnits(bal, decimals);
};
