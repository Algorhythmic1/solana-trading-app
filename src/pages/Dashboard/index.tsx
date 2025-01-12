// src/pages/Dashboard/index.tsx

import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { ContextType } from '../../types';

interface TokenBalance {
  mint: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export const DashboardPage = () => {
  const { wallet, selectedNetwork } = useOutletContext<ContextType>();
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for null wallet before useEffect
  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    const fetchBalance = async () => {
      if (!wallet) return; // Extra safety check
      
      try {
        setLoading(true);
        const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
        const solBalance = await connection.getBalance(wallet.publicKey);
        setBalance(solBalance / LAMPORTS_PER_SOL);

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );

        const tokens = tokenAccounts.value.map(account => ({
          mint: account.account.data.parsed.info.mint,
          balance: account.account.data.parsed.info.tokenAmount.amount,
          decimals: account.account.data.parsed.info.tokenAmount.decimals,
          symbol: 'Unknown', // We'll fetch this from metadata later
        }));

        setTokenBalances(tokens);

      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(null);
        setTokenBalances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [wallet, selectedNetwork]);

  return (
    <div className="h-full w-full overflow-auto p-4 ">
      <div className="container cyberpunk max-w-full bg-sol-background">
        <h1 className="cyberpunk">Dashboard</h1>
        <div className="card cyberpunk w-full max-w-4xl mx-auto">
          <h2 className="cyberpunk">Wallet Details</h2>
          <div className="text-sm break-all">
            <p>Public Key: {wallet.publicKey.toString()}</p>
            <p className="mt-2">
              Balance: {loading ? (
                <span>Loading...</span>
              ) : (
                <span>{balance?.toFixed(4)} SOL</span>
              )}
            </p>
          </div>
        </div>
        {tokenBalances.length > 0 && (
          <div className="card cyberpunk w-full max-w-4xl mx-auto mt-4">
            <h2 className="cyberpunk">Token Balances</h2>
            <div className="space-y-2">
              {tokenBalances.map((token) => (
                <div key={token.mint} className="text-sm">
                  <p>
                    {token.symbol}: {(Number(token.balance) / Math.pow(10, token.decimals)).toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;