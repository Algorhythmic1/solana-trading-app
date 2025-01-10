import { Keypair } from '@solana/web3.js';

export type Network = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkInfo {
  name: Network;
  endpoint: string;
}

export type ContextType = {
  wallet: Keypair;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
};