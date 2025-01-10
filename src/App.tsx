import { useState, useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useOutletContext, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Keypair, Connection, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { Wallet as WalletIcon, Send, History, Settings, Layout } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import base58 from 'bs58';
import ErrorBoundary from './ErrorBoundary';
import './App.css';

type Network = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

interface NetworkInfo {
  name: Network;
  endpoint: string;
}

const NETWORKS: NetworkInfo[] = [
  { name: 'localnet', endpoint: 'http://127.0.0.1:8899' },
  { name: 'devnet', endpoint: clusterApiUrl('devnet') },
  { name: 'testnet', endpoint: clusterApiUrl('testnet') },
  { name: 'mainnet-beta', endpoint: 'https://mainnet.helius-rpc.com/?api-key=34ff2ba3-5858-43cc-a351-b2cf9b3420fb' }
];

interface NetworkSelectorProps {
  selectedNetwork: NetworkInfo;
  onNetworkChange: (network: NetworkInfo) => void;
}

const NetworkSelector = ({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      
      try {
        console.log(`Checking connection to ${selectedNetwork.name}...`);
        const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
        const version = await connection.getVersion();
        console.log(`Connected to ${selectedNetwork.name}:`, version);
        setConnectionStatus('connected');
      } catch (error) {
        console.error(`Failed to connect to ${selectedNetwork.name}:`, error);
        setConnectionStatus('error');
      }
    };

    checkConnection();
  }, [selectedNetwork]);

  return (
<div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border-2 border-[#39ff14] rounded">
  <select
    value={selectedNetwork.name}
    onChange={(e) => {
      const network = NETWORKS.find(n => n.name === e.target.value as Network);
      if (network) onNetworkChange(network);
    }}
    className="cyberpunk px-2 py-1 bg-transparent text-[#39ff14] border-none focus:outline-none"
  >
    {NETWORKS.map(network => (
      <option key={network.name} value={network.name} className="bg-[#0a0a0a]">
        {network.name.charAt(0).toUpperCase() + network.name.slice(1)}
      </option>
    ))}
  </select>
  
  <div className="flex items-center gap-2">
    <div 
      className={`w-2.5 h-2.5 rounded-full ${
        connectionStatus === 'checking' ? 'animate-pulse bg-[#39ff14]/50' :
        connectionStatus === 'connected' ? 'bg-[#39ff14] shadow-[0_0_10px_#39ff14]' :
        'bg-red-500 shadow-[0_0_10px_#ff0000]'
      }`} 
    />
    <span className="text-[#39ff14]">
      {connectionStatus === 'checking' ? 'Connecting...' :
       connectionStatus === 'connected' ? 'Connected' :
       'Disconnected'}
    </span>
  </div>
</div>
  );
};

export { NetworkSelector, type Network, type NetworkInfo, NETWORKS };

// Helper functions for keyring operations
const saveWalletToKeyring = async (keypair: Keypair) => {
  try {
    const secretKeyString = base58.encode(keypair.secretKey);
    console.log('Attempting to save to keyring:', secretKeyString.slice(0, 10) + '...');
    await invoke('save_to_keyring', { key: secretKeyString });
    console.log('Successfully saved to keyring');
  } catch (error) {
    console.error('Failed to save to keyring:', error);
    throw error;
  }
};

const loadWalletFromKeyring = async (): Promise<Keypair | null> => {
  try {
    console.log('Attempting to load from keyring...');
    const secretKeyString = await invoke<string>('load_from_keyring');
    console.log('Got key from keyring:', secretKeyString.slice(0, 10) + '...');
    const secretKey = base58.decode(secretKeyString);
    console.log('Decoded key length:', secretKey.length);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.log('Error loading from keyring:', error);
    return null;
  }
};

// Type for the outlet context
type ContextType = {
  wallet: Keypair;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
};

// Add back the navigation items
const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Layout },
  { name: 'Send', path: '/send', icon: Send },
  { name: 'History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

// Add back the Sidebar component
const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }: { 
  isMobileMenuOpen: boolean, 
  setIsMobileMenuOpen: (open: boolean) => void 
}) => {
  const location = useLocation();

  const NavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <NavLink
        to={item.path}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
          isActive 
            ? 'bg-[#39ff14]/20 text-[#39ff14]' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-[#39ff14]'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <Icon size={20} />
        <span>{item.name}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-30
        w-64 bg-[#0a0a0a] border-r-2 border-[#39ff14]
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b-2 border-[#39ff14]">
          <div className="flex items-center gap-2">
            <WalletIcon className="text-[#39ff14]" />
            <span className="font-bold text-lg text-[#39ff14]">SOLedge Trading</span>
          </div>
        </div>
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
};

// Modify AuthenticatedLayout to use the mobile menu
const AuthenticatedLayout = ({ 
  wallet, 
  setWallet,
  selectedNetwork,
  setSelectedNetwork 
}: { 
  wallet: Keypair | null, 
  setWallet: (wallet: Keypair | null) => void,
  selectedNetwork: NetworkInfo,
  setSelectedNetwork: (network: NetworkInfo) => void
}) => {
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

// Welcome page with wallet setup
const WelcomePage = ({ setWallet }: { setWallet: (wallet: Keypair | null) => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState('');
  const [storedWallets, setStoredWallets] = useState<{ public_key: string }[]>([]);

  // Load stored wallets on component mount
  useEffect(() => {
    const loadStoredWallets = async () => {
      try {
        const wallets = await invoke<{ public_key: string }[]>('list_stored_wallets');
        setStoredWallets(wallets);
      } catch (error) {
        console.error('Failed to load stored wallets:', error);
      }
    };
    loadStoredWallets();
  }, []);

  const loadSelectedWallet = async (publicKey: string) => {
    setLoading(true);
    try {
      const walletData = await invoke<string>('load_from_keyring', { publicKey });
      const secretKey = base58.decode(walletData);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Verify the public key matches
      if (keypair.publicKey.toString() === publicKey) {
        await setWallet(keypair);
      } else {
        throw new Error('Public key mismatch');
      }
    } catch (error) {
      setError('Failed to load selected wallet');
    } finally {
      setLoading(false);
    }
  };

  const importWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const secretKey = base58.decode(privateKey);
      if (secretKey.length !== 64) {
        throw new Error('Invalid private key length');
      }
      
      const importedWallet = Keypair.fromSecretKey(secretKey);
      await setWallet(importedWallet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid private key format';
      setError(`Failed to import wallet: ${errorMessage}`);
    } finally {
      setLoading(false);
      setPrivateKey('');
    }
  };

  const createWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const newWallet = Keypair.generate();
      await setWallet(newWallet);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container cyberpunk grid-bg min-h-screen p-8">
      <h1 className="cyberpunk text-[#39ff14] text-center mb-8">Welcome to SOL Edge</h1>
      
      {storedWallets.length > 0 && (
        <div className="mb-8">
          <h2 className="cyberpunk text-[#39ff14] mb-4">Stored Wallets</h2>
          <div className="space-y-2">
            {storedWallets.map((wallet) => (
              <button
                key={wallet.public_key}
                onClick={() => loadSelectedWallet(wallet.public_key)}
                className="card cyberpunk w-full text-left p-4 hover:border-[#39ff14]/80"
              >
                <span className="text-sm font-mono">{wallet.public_key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-[#39ff14] my-8">
        {storedWallets.length > 0 ? 'OR ADD NEW WALLET' : 'ADD NEW WALLET'}
      </div>

      {/* Your existing import form */}
      <form onSubmit={importWallet} className="mb-8">
        <label className="block mb-2 text-[#39ff14]">Import Existing Wallet</label>
        <input
          type="password"
          className="cyberpunk w-full mb-4"
          placeholder="Enter private key (base58 format)"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !privateKey}
          className="cyberpunk w-full"
        >
          {loading ? 'Importing...' : 'Import Wallet'}
        </button>
      </form>

      <div className="text-center text-[#39ff14] my-8">OR</div>

      <button
        onClick={createWallet}
        disabled={loading}
        className="cyberpunk w-full"
      >
        {loading ? 'Creating Wallet...' : 'Create New Wallet'}
      </button>

      {error && (
        <p className="mt-4 text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

// Dashboard page showing wallet info and actions
const DashboardPage = () => {
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

  // Only render content if we have a wallet
  return (
    <div className="h-full w-full overflow-auto p-4">
      <div className="container cyberpunk max-w-full">
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

// Create router configuration
const createRouter = (
  wallet: Keypair | null, 
  setWallet: (wallet: Keypair | null) => void,
  selectedNetwork: NetworkInfo,
  setSelectedNetwork: (network: NetworkInfo) => void
) => 
  createBrowserRouter([
    {
      path: '/',
      element: !wallet ? (
        <WelcomePage setWallet={setWallet} />
      ) : (
        <Navigate to="/dashboard" replace />
      ),
      errorElement: <ErrorBoundary />
    },
    {
      element: <AuthenticatedLayout 
        wallet={wallet} 
        setWallet={setWallet}
        selectedNetwork={selectedNetwork}
        setSelectedNetwork={setSelectedNetwork}
      />,
      children: [
        {
          path: 'dashboard',
          element: <DashboardPage />,
          errorElement: <ErrorBoundary />
        },
        // Placeholder pages - you can replace these with actual components
        {
          path: 'send',
          element: <div className="p-4">Send Page</div>,
        },
        {
          path: 'history',
          element: <div className="p-4">Transaction History Page</div>,
        },
        {
          path: 'settings',
          element: <div className="p-4">Settings Page</div>,
        },
      ],
    },
  ]);

// Main App component
const App = () => {
  const [wallet, setWallet] = useState<Keypair | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkInfo>(NETWORKS[0]);
  const hasTriedLoading = useRef(false);

  useEffect(() => {
    const loadWallet = async () => {
      // Prevent multiple loads
      if (hasTriedLoading.current) return;
      hasTriedLoading.current = true;

      try {
        console.log('Attempting initial wallet load...');
        const loadedWallet = await loadWalletFromKeyring();
        if (loadedWallet) {
          console.log('Wallet loaded successfully');
          setWallet(loadedWallet);
        } else {
          console.log('No wallet found in keyring');
        }
      } catch (error) {
        console.error('Error loading wallet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWallet();
  }, []);

  // Wrap the setWallet function to persist changes
  const handleSetWallet = async (newWallet: Keypair | null) => {
    if (newWallet) {
      await saveWalletToKeyring(newWallet);
    } else {
      // When disconnecting, try to clear the keyring
      try {
        await invoke('save_to_keyring', { key: '' });
      } catch (error) {
        console.error('Failed to clear keyring:', error);
      }
    }
    setWallet(newWallet);
  };

  const router = createRouter(wallet, handleSetWallet, selectedNetwork, setSelectedNetwork);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      Loading...
    </div>;
  }

  return <RouterProvider router={router} />;
};

export default App;