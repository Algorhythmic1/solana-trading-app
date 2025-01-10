import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Keypair } from '@solana/web3.js';
import { NetworkInfo } from '../../types';
import { Sidebar } from './Sidebar';
import { NetworkSelector } from '../network/NetworkSelector';

interface AuthenticatedLayoutProps {
  wallet: Keypair | null;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
  setSelectedNetwork: (network: NetworkInfo) => void;
}

export const AuthenticatedLayout = ({ 
  wallet, 
  setWallet,
  selectedNetwork,
  setSelectedNetwork 
}: AuthenticatedLayoutProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();  // Add this
  
    const handleDisconnect = async () => {
      await setWallet(null);
      navigate('/', { replace: true });  // Explicitly navigate
    };
  
    if (!wallet) {
      return <Navigate to="/" replace />;
    }
  
    return (
      <div className="min-h-screen grid-bg">
        <nav className="bg-[#0a0a0a] border-b-2 border-[#39ff14] px-4 py-3">
          <div className="flex items-center justify-between">
            {/* ... other nav items ... */}
            <div className="flex items-center gap-4">
              <NetworkSelector
                selectedNetwork={selectedNetwork}
                onNetworkChange={setSelectedNetwork}
              />
              <button
                onClick={handleDisconnect}  // Use the new handler
                className="cyberpunk"
              >
                Disconnect
              </button>
            </div>
          </div>
        </nav>
        
        <div className="flex h-screen lg:h-auto">
          <Sidebar 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <main className="flex-1 p-6 lg:p-8">
            <Outlet context={{ wallet, setWallet, selectedNetwork }} />
          </main>
        </div>
      </div>
    );
};