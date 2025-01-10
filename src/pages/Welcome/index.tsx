import { useState, useEffect } from 'react';
import { Keypair } from '@solana/web3.js';
import { invoke } from '@tauri-apps/api/core';
import base58 from 'bs58';

interface WelcomePageProps {
  setWallet: (wallet: Keypair | null) => void;
}

export const WelcomePage = ({ setWallet }: WelcomePageProps) => {
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