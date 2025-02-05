import { Keypair, Cluster } from '@solana/web3.js';

export type Network = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta';

export interface NetworkInfo {
  name: Network;
  endpoint: string;
  cluster?: Cluster;
}

export type ContextType = {
  wallet: Keypair;
  setWallet: (wallet: Keypair | null) => void;
  selectedNetwork: NetworkInfo;
  setSelectedNetwork: (network: NetworkInfo) => void;
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

export interface TokenWithBalance extends JupiterToken {
  balance: string;
}

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: number;
  outAmount: number;
  otherAmountThreshold: number;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number | string;
  routePlan: RoutePlanStep[];
  contextSlot: number;
  timeTaken: number;
}

interface RoutePlanStep {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: number;
    outAmount: number;
    feeAmount: number;
    feeMint: string;
  };
  percent: number;
}
