// src/constants/networks.ts

import { LayoutDashboard, SendHorizontal, History, Settings, ArrowLeftRight } from 'lucide-react';
import { clusterApiUrl } from '@solana/web3.js';
import { NetworkInfo } from '../types';

const rpcUrl = import.meta.env.VITE_RPC_URL;
console.log('Initializing networks with Helius URL:', rpcUrl);

export const NETWORKS: NetworkInfo[] = [
  { 
    name: 'localnet', 
    endpoint: 'http://127.0.0.1:8899',
    cluster: 'devnet'
  },
  { 
    name: 'devnet', 
    endpoint: clusterApiUrl('devnet'),
    cluster: 'devnet'
  },
  { 
    name: 'testnet', 
    endpoint: clusterApiUrl('testnet'),
    cluster: 'testnet'
  },
  { 
    name: 'mainnet-beta', 
    endpoint: rpcUrl ||clusterApiUrl('mainnet-beta'),
    cluster: 'mainnet-beta'
  }
];

// Add some debugging
const mainnetNetwork = NETWORKS.find(n => n.name === 'mainnet-beta');
console.log('Network configuration:', {
  rpcUrl,
  mainnetEndpoint: mainnetNetwork?.endpoint,
  usingHelius: mainnetNetwork?.endpoint === rpcUrl
});

export const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Send', path: '/send', icon: SendHorizontal },
  { name: 'Swap', path: '/swap', icon: ArrowLeftRight },
  { name: 'History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];