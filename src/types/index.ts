import { Keypair, Connection, Cluster } from '@solana/web3.js';

export type Network = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkInfo {
  name: Network;
  endpoint: string;
  cluster?: Cluster;
  explorerUrl: string;
}

export type ContextType = {
  wallet: Keypair;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
  setSelectedNetwork: (network: NetworkInfo) => void;
  connection: Connection;
};

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI?: string;
  tags?: string[];
}
