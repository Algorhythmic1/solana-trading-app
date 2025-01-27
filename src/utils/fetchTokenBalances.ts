import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TokenWithBalance, NetworkInfo } from '../types';
import { searchTokensByAny } from './getAllTokens';

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
    if (setBalance) {
      const solBalance = await connection.getBalance(wallet.publicKey);
      setBalance(solBalance / LAMPORTS_PER_SOL);
    }

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

        // Get token info with retries
        let tokenInfo = null;
        for (let i = 0; i < 3; i++) {
          try {
            tokenInfo = (await searchTokensByAny(mintAddress))[0];
            if (tokenInfo) break;
          } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
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

    return tokens;
  } catch (error) {
    if (setBalance) setBalance(null);
    throw error;
  } finally {
    setLoading?.(false);
  }
}; 