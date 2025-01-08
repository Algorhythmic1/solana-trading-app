import { useState, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';
import "./App.css";

function App() {
  // You can use Mainnet, Testnet, or Devnet
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // Initialize supported wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AppContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function AppContent() {
  const { publicKey, connected } = useWallet();
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="logo-container">
      <h1>Welcome to permissionless finance. Use at your own risk. </h1>
      <h3>(Don't use if you don't understand what you're doing)</h3>

      <div className="row">
        <a target="_blank">
          <img 
            src="/crypto-logo-2.svg" 
            className="logo two" 
            alt="Crypto logo one" 
          />
        </a>
      </div>

      <div className="wallet-section">
        <WalletMultiButton />
        {connected && (
          <p className="wallet-address">
            Connected: {publicKey?.toBase58()}
          </p>
        )}
      </div>

      <p>Connect your wallet to begin</p>
 
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;