// src/pages/Dashboard/index.tsx

import { useState, useEffect } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { ContextType, TokenWithBalance } from '../../types';
import { fetchTokenBalances } from '../../utils/fetchTokenBalances';


export const DashboardPage = () => {
  const { wallet, selectedNetwork } = useOutletContext<ContextType>();
  const [balance, setBalance] = useState<number | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenWithBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for null wallet before useEffect
  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  const handleFetchTokens = async () => {
    try {
      const tokens = await fetchTokenBalances({
        wallet,
        selectedNetwork,
        setBalance,
        setLoading
      });
      setWalletTokens(tokens);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      setWalletTokens([]);
    }
  };

  useEffect(() => {
    handleFetchTokens();
  }, [wallet, selectedNetwork]);

  return (
    <div className="h-full w-full overflow-auto p-4 ">
      <div className="container cyberpunk max-w-full bg-sol-background">
        <div className="flex justify-between items-center mb-8 gap-8">
          <h1 className="cyberpunk text-2xl">Dashboard</h1>
          <div className="flex justify-end flex-1">
            <button 
              onClick={handleFetchTokens}
              disabled={loading}
              className="cyberpunk modal-btn"
            >
              {loading ? 'Refreshing...' : 'Refresh Balances'}
            </button>
          </div>
        </div>
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
        {walletTokens.length > 0 && (
          <div className="card cyberpunk w-full max-w-4xl mx-auto mt-4">
            <h2 className="cyberpunk">Token Balances</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {walletTokens.map((token: TokenWithBalance) => (
                <div key={token.address} className="card cyberpunk p-4 flex items-center space-x-4">
                  <div className="w-12 h-12 flex-shrink-0">
                    {token.logoURI ? (
                      <img 
                        src={token.logoURI} 
                        alt={token.symbol}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/token-placeholder.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-sol-card rounded-full flex items-center justify-center">
                        <span className="text-xl text-sol-green">
                          {token.symbol.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-sol-green font-bold">{token.symbol}</h3>
                    <p className="text-sol-text text-sm">{token.name}</p>
                    <p className="text-sol-green mt-1">
                      {(Number(token.balance) / Math.pow(10, token.decimals)).toFixed(4)}
                    </p>
                  </div>
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