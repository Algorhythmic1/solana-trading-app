import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenWithBalance, NetworkInfo } from '../types';
import { searchTokensByAny } from './tokenQueryUtils';

interface FetchTokenBalancesOptions {
  wallet: Keypair;
  selectedNetwork: NetworkInfo;
  setBalance?: (balance: number | null) => void;
  setLoading?: (loading: boolean) => void;
}

export const fetchTokenBalances = async ({
  wallet,
  selectedNetwork,
  setBalance,
  setLoading,
}: FetchTokenBalancesOptions): Promise<TokenWithBalance[]> => {
  setLoading?.(true);
  const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
  
  try {
    // Get SOL balance if needed
    const solBalance = await connection.getBalance(wallet.publicKey);
    if (setBalance) {
      setBalance(solBalance / LAMPORTS_PER_SOL);
    }

    // Create TokenWithBalance for SOL
    const nativeSolToken: TokenWithBalance = {
      address: 'native',
      chainId: 101,
      decimals: 9,
      name: 'Solana',
      symbol: 'SOL',
      logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      balance: solBalance.toString()
    };

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID },
      'confirmed'
    );

    const tokens = (await Promise.all(tokenAccounts.value.map(async account => {
      try {
        const mintAddress = account.account.data.parsed.info.mint;
        const balance = account.account.data.parsed.info.tokenAmount.amount;
        const decimals = account.account.data.parsed.info.tokenAmount.decimals;

        let tokenInfo = null;
        tokenInfo = (await searchTokensByAny(mintAddress))[0];
        if (!tokenInfo) return null;

        return {
          ...tokenInfo,
          balance,
          decimals,
        } as TokenWithBalance;
      } catch (err) {
        return null;
      }
    }))).filter((t): t is TokenWithBalance => t !== null);

    return [nativeSolToken, ...tokens];
  } catch (error) {
    if (setBalance) setBalance(null);
    throw error;
  } finally {
    setLoading?.(false);
  }
}; 