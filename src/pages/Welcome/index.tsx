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
        console.log('Loaded wallets:', wallets);
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

  const refreshTokens = async () => {
    try {
      console.log('Refreshing token list in database');
      await invoke('update_token_db');  // This updates the token database
    } catch (error) {
      console.error('Failed to refresh token list:', error);
    }
  };

  useEffect(() => {
    refreshTokens();
  }, []);

  return (
    <div className="h-full w-full bg-sol-background overflow-auto p-4 grid-bg">
      <div className="container cyberpunk max-w-full mb-8 bg-sol-background/50">
        <h1 className="cyberpunk text-sol-green text-center">Welcome to SOL Edge</h1>
        
        <div className="mb-8 w-full max-w-[600px] mx-auto">
          <label className="block mb-2 text-sol-green">Stored Wallets</label>
          {storedWallets.length === 0 ? (
            <p className="text-sol-green text-center">No stored wallets found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto w-full">
              {storedWallets.map((wallet) => (
                <button
                  key={wallet.public_key}
                  onClick={() => loadSelectedWallet(wallet.public_key, wallet.account)}
                  className="card cyberpunk w-full text-left p-4 hover:border-sol-green/80 flex justify-between items-center"
                  disabled={loading}
                >
                  <div className="flex flex-col flex-grow mr-4">
                    <span className="text-sm text-sol-text">Public Key:</span>
                    <span className="text-sm font-mono text-sol-green truncate max-w-[300px]">
                      {wallet.public_key}
                    </span>
                  </div>
                  <span className="text-sol-green text-sm whitespace-nowrap">Select →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-[color:var(--sol-green)] my-8">OR</div>

        <form onSubmit={importWallet} className="mb-8 w-full max-w-[600px] mx-auto">
          <label className="block mb-2 text-sol-green">Import Existing Wallet</label>
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

        <div className="text-center text-[color:var(--sol-green)] my-8">OR</div>
        
        <div className="w-full max-w-[600px] mx-auto">
          <button
            onClick={createWallet}
            disabled={loading}
            className="cyberpunk w-full"
          >
            {loading ? 'Creating Wallet...' : 'Create New Wallet'}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sol-error text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};