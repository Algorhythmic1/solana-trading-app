// src/pages/Dashboard/index.tsx

import { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Navigate, useOutletContext } from 'react-router-dom';
import type { ContextType } from '../../types';

export const DashboardPage = () => {
  const { wallet, selectedNetwork } = useOutletContext<ContextType>();
  const [balance, setBalance] = useState<number | null>(null);
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
        const balance = await connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        setBalance(null);
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
      </div>
    </div>
  );
};

export default DashboardPage;