import { useState, useRef, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Keypair, Connection } from '@solana/web3.js';
import { invoke } from '@tauri-apps/api/core';

// Import constants
import { NETWORKS } from './constants/networks';

// Import utils
import { saveWalletToKeyring } from './utils/wallet';

// Import components
import { AuthenticatedLayout } from './components/layout/AuthenticatedLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Import pages
import { WelcomePage } from './pages/Welcome';
import { DashboardPage } from './pages/Dashboard';
import { SendPage } from './pages/Send';
import { HistoryPage } from './pages/History';
import { SettingsPage } from './pages/Settings';
import { SwapPage } from './pages/Swap';

// Import types
import type { NetworkInfo } from './types';

// Create router configuration
const createRouter = (
  wallet: Keypair | null, 
  setWallet: (wallet: Keypair | null) => void,
  selectedNetwork: NetworkInfo,
  setSelectedNetwork: (network: NetworkInfo) => void,
  connection: Connection
) => 
  createBrowserRouter([
    {
      path: '/',
      element: <WelcomePage setWallet={setWallet} />,
      errorElement: <ErrorBoundary />
    },
    {
      element: wallet ? (
        <AuthenticatedLayout 
          wallet={wallet} 
          setWallet={setWallet}
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
          connection={connection}
        />
      ) : (
        <Navigate to="/" replace />
      ),
      children: [
        {
          path: 'dashboard',
          element: <DashboardPage />,
          errorElement: <ErrorBoundary />
        },
        {
          path: 'send',
          element: <SendPage />,
          errorElement: <ErrorBoundary />
        },
        {
          path: 'swap',
          element: <SwapPage />,
          errorElement: <ErrorBoundary />
        },
        {
          path: 'history',
          element: <HistoryPage />,
          errorElement: <ErrorBoundary />
        },
        {
          path: 'settings',
          element: <SettingsPage />,
          errorElement: <ErrorBoundary />
        }
      ],
    }
  ]);

const App = () => {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkInfo>(NETWORKS[0]);
  const [connection, setConnection] = useState<Connection>(
    new Connection(selectedNetwork.endpoint, 'confirmed')
  );
  const hasTriedLoading = useRef(false);

  // Update connection when network changes
  useEffect(() => {
    console.log('Creating new connection for network:', selectedNetwork.name);
    const newConnection = new Connection(selectedNetwork.endpoint, 'confirmed');
    setConnection(newConnection);
  }, [selectedNetwork.endpoint]);

  useEffect(() => {
    const loadInitialState = async () => {
      // Prevent multiple loads
      if (hasTriedLoading.current) return;
      hasTriedLoading.current = true;

      try {
        setLoading(false); // We'll move this earlier since we don't auto-connect anymore
      } catch (error) {
        console.error('Error loading initial state:', error);
        setLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Wrap the setWallet function to persist changes
  const handleSetWallet = async (newWallet: Keypair | null, shouldSave: boolean = false) => {
    if (newWallet && shouldSave) {
      await saveWalletToKeyring(newWallet);
    } else if (!newWallet) {
      // When disconnecting, try to clear the keyring
      try {
        await invoke('save_to_keyring', { key: '' });
      } catch (error) {
        console.error('Failed to clear keyring:', error);
      }
    }
    setWallet(newWallet);
  };

  const router = createRouter(
    wallet, 
    handleSetWallet, 
    selectedNetwork,
    setSelectedNetwork,
    connection
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

export default App;