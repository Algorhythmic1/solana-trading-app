import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Keypair, Connection } from '@solana/web3.js';
import { NetworkInfo } from '../../types';
import { Sidebar } from './Sidebar';
import { NetworkSelector } from '../network/NetworkSelector';
import { NETWORKS } from '../../constants/networks';

interface AuthenticatedLayoutProps {
  wallet: Keypair | null;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
  setSelectedNetwork: (network: NetworkInfo) => void;
  connection: Connection;
}

export const AuthenticatedLayout = ({ 
  wallet, 
  setWallet,
  connection
}: AuthenticatedLayoutProps) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkInfo>(
      NETWORKS.find(n => n.name === 'mainnet-beta') || NETWORKS[0]
    );
    const navigate = useNavigate();  
  
    const handleDisconnect = async () => {
      await setWallet(null);
      navigate('/', { replace: true });  
    };
  
    if (!wallet) {
      return <Navigate to="/" replace />;
    }
  
    return (
      <div className="min-h-screen grid-bg bg-sol-background">
          <nav className="bg-sol-background border-b-2 border-sol-green px-4 py-3">
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

        <div className="flex flex-1">
          <Sidebar 
            isMobileMenuOpen={isMobileMenuOpen} 
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <main className="flex-1 p-6 lg:p-8">
            <Outlet context={{ wallet, setWallet, selectedNetwork, connection }} />
          </main>
        </div>
      </div>
    );
};