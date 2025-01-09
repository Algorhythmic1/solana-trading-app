import { useState, useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useOutletContext, NavLink, useLocation } from 'react-router-dom';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Layout, Wallet as WalletIcon, Send, History, Settings, Menu } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import base58 from 'bs58';

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
    const secretKeyString = await invoke<string>('load_from_keyring');
    const secretKey = base58.decode(secretKeyString);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.log('No wallet found in keyring');
    return null;
  }
};

// Type for the outlet context
type ContextType = {
  wallet: Keypair;
  setWallet: (wallet: Keypair | null) => void;
};

// Sidebar navigation items
const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Layout },
  { name: 'Send', path: '/send', icon: Send },
  { name: 'History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

// Sidebar component
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
            ? 'bg-blue-500/20 text-blue-400' 
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
        w-64 bg-gray-900 border-r border-gray-700
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <WalletIcon className="text-blue-500" />
            <span className="font-bold text-lg">Solana Wallet</span>
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

// Layout component that wraps all authenticated pages
const AuthenticatedLayout = ({ wallet, setWallet }: { wallet: Keypair | null, setWallet: (wallet: Keypair | null) => void }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1 rounded hover:bg-gray-700"
          >
            <Menu size={24} />
          </button>
          <button
            onClick={() => setWallet(null)}
            className="px-3 py-1 text-sm rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            Disconnect
          </button>
        </div>
      </nav>

      {/* Main layout with sidebar */}
      <div className="flex h-screen lg:h-auto">
        <Sidebar 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="hidden lg:flex justify-end mb-6">
              <button
                onClick={() => setWallet(null)}
                className="px-3 py-1 text-sm rounded bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                Disconnect
              </button>
            </div>
            <Outlet context={{ wallet, setWallet }} />
          </div>
        </main>
      </div>
    </div>
  );
};

// Welcome page with wallet setup
const WelcomePage = ({ setWallet }: { setWallet: (wallet: Keypair | null) => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Starting wallet creation...');
      const newWallet = Keypair.generate();
      console.log('Wallet generated:', newWallet.publicKey.toString());
      
      console.log('Connecting to devnet...');
      const connection = new Connection(
        'https://api.devnet.solana.com', 
        'confirmed'
      );
      
      console.log('Requesting airdrop...');
      const airdropSignature = await connection.requestAirdrop(
        newWallet.publicKey,
        LAMPORTS_PER_SOL
      ).catch(err => {
        console.error('Airdrop request failed:', err);
        throw new Error('Failed to request SOL airdrop');
      });

      console.log('Confirming airdrop transaction...');
      await connection.confirmTransaction(airdropSignature, 'confirmed');
      
      console.log('Setting wallet in state...');
      await setWallet(newWallet);
      
      console.log('Wallet creation complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to create wallet:', errorMessage);
      setError(`Failed to create wallet: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 rounded-lg bg-gray-800 border border-gray-700">
      <h1 className="text-2xl font-bold mb-4">Welcome to Solana Wallet</h1>
      <p className="text-gray-300 mb-6">
        To get started, create a new wallet on Solana devnet.
      </p>
      <button
        onClick={createWallet}
        disabled={loading}
        className="w-full py-2 px-4 rounded bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
      >
        {loading ? 'Creating Wallet...' : 'Create New Wallet'}
      </button>
      {error && (
        <p className="mt-4 text-red-400 text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

// Dashboard page showing wallet info and actions
const DashboardPage = () => {
  const { wallet } = useOutletContext<ContextType>();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
          <h2 className="text-lg font-semibold mb-2">Wallet Details</h2>
          <div className="text-sm text-gray-300 break-all">
            <p>Public Key: {wallet.publicKey.toString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create router configuration
const createRouter = (wallet: Keypair | null, setWallet: (wallet: Keypair | null) => void) => 
  createBrowserRouter([
    {
      path: '/',
      element: !wallet ? (
        <WelcomePage setWallet={setWallet} />
      ) : (
        <Navigate to="/dashboard" replace />
      ),
    },
    {
      element: <AuthenticatedLayout wallet={wallet} setWallet={setWallet} />,
      children: [
        {
          path: 'dashboard',
          element: <DashboardPage />,
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

  // Add a ref to track if we've already tried loading
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

  const router = createRouter(wallet, handleSetWallet);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      Loading...
    </div>;
  }

  return <RouterProvider router={router} />;
};

export default App;