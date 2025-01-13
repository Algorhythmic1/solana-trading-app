// src/constants/networks.ts

import { LayoutDashboard, SendHorizontal, History, Settings, ArrowLeftRight } from 'lucide-react';
import { clusterApiUrl } from '@solana/web3.js';
import { NetworkInfo } from '../types';

export const NETWORKS: NetworkInfo[] = [
  { 
    name: 'localnet', 
    endpoint: 'http://127.0.0.1:8899',
    cluster: 'devnet',
    explorerUrl: 'https://explorer.solana.com'
  },
  { 
    name: 'devnet', 
    endpoint: clusterApiUrl('devnet'),
    cluster: 'devnet',
    explorerUrl: 'https://explorer.solana.com'
  },
  { 
    name: 'testnet', 
    endpoint: clusterApiUrl('testnet'),
    cluster: 'testnet',
    explorerUrl: 'https://explorer.solana.com'
  },
  { 
    name: 'mainnet-beta', 
    endpoint: 'https://mainnet.helius-rpc.com/?api-key=34ff2ba3-5858-43cc-a351-b2cf9b3420fb',
    cluster: 'mainnet-beta',
    explorerUrl: 'https://explorer.solana.com'
  }
];

export const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Send', path: '/send', icon: SendHorizontal },
  { name: 'Swap', path: '/swap', icon: ArrowLeftRight },
  { name: 'History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];