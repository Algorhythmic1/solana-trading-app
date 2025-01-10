import { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { invoke } from '@tauri-apps/api/core';
import base58 from 'bs58';
import { useNavigate } from 'react-router-dom';

const ACCOUNT_NAME = 'wallet-key';

interface WelcomePageProps {
  setWallet: (wallet: Keypair | null, shouldSave?: boolean) => void;
}

interface StoredWallet {
  public_key: string;
  account: string;
}

export const WelcomePage = ({ setWallet }: WelcomePageProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState('');
  const [storedWallets, setStoredWallets] = useState<StoredWallet[]>([]);

  const handleWalletLoad = async (keypair: Keypair) => {
    await setWallet(keypair, false);
    navigate('/dashboard')
  }

  useEffect(() => {
    const loadStoredWallets = async () => {
      try {
        const wallets = await invoke<StoredWallet[]>('list_stored_wallets');
        setStoredWallets(wallets);
      } catch (error) {
        console.error('Error loading stored wallets:', error);
      }
    };

    loadStoredWallets();
  }, []);

  const loadSelectedWallet = async (publicKey: string, account: string) => {
    
    setLoading(true);
    try {
      const index = parseInt(account.replace(ACCOUNT_NAME, ''));
      const walletData = await invoke<string>('load_from_keyring', { index });
      const secretKey = base58.decode(walletData);
      const keypair = Keypair.fromSecretKey(secretKey);
      
      // Verify the public key matches
      if (keypair.publicKey.toString() === publicKey) {
        await handleWalletLoad(keypair);
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
      await setWallet(importedWallet, true); // Save when importing new wallet
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
      await setWallet(newWallet, true); // Save when creating new wallet
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
      
      <div className="mb-8">
        <h2 className="cyberpunk text-[#39ff14] mb-4">Stored Wallets</h2>
        {storedWallets.length === 0 ? (
          <p className="text-gray-400 text-center">No stored wallets found</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {storedWallets.map((wallet) => (
              <button
                key={wallet.public_key}
                onClick={() => loadSelectedWallet(wallet.public_key, wallet.account)}
                className="card cyberpunk w-full text-left p-4 hover:border-[#39ff14]/80 flex justify-between items-center"
                disabled={loading}
              >
                <div className="flex flex-col">
                  <span className="text-sm text-gray-400">Public Key:</span>
                  <span className="text-sm font-mono text-[#39ff14] truncate max-w-[300px]">
                    {wallet.public_key}
                  </span>
                </div>
                <span className="text-[#39ff14] text-sm">Select →</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-center text-[#39ff14] my-8">OR</div>

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