import { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';
import { NetworkInfo, Network } from '../../types';
import { NETWORKS } from '../../constants/networks';

interface NetworkSelectorProps {
  selectedNetwork: NetworkInfo;
  onNetworkChange: (network: NetworkInfo) => void;
}

export const NetworkSelector = ({ selectedNetwork, onNetworkChange }: NetworkSelectorProps) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      
      try {
        console.log(`Checking connection to ${selectedNetwork.name}...`);
        const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
        const version = await connection.getVersion();
        console.log(`Connected to ${selectedNetwork.name}:`, version);
        setConnectionStatus('connected');
      } catch (error) {
        console.error(`Failed to connect to ${selectedNetwork.name}:`, error);
        setConnectionStatus('error');
      }
    };

    checkConnection();
  }, [selectedNetwork]);

  return (
    <div className="flex items-center gap-4 p-4 bg-[color:var(--sol-background)] border-2 border-[color:var(--sol-border)] rounded">
      <div className="select-wrapper w-[250px]">
        <select
          value={selectedNetwork.name}
          onChange={(e) => {
            const network = NETWORKS.find(n => n.name === e.target.value as Network);
            if (network) onNetworkChange(network);
          }}
          className="cyberpunk px-2 py-1 bg-sol-background text-sol-bright-green border-none focus:outline-none w-full"
        >
          {NETWORKS.map(network => (
            <option key={network.name} value={network.name} className="bg-[#0a0a0a]">
              {network.name.charAt(0).toUpperCase() + network.name.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex items-center gap-2">
        <div 
          className={`w-3 h-3 rounded-full relative z-10 ${
            connectionStatus === 'checking' ? 'animate-pulse bg-[color:var(--sol-bright-green)] opacity-50' :
            connectionStatus === 'connected' ? 'bg-[color:var(--sol-bright-green)] shadow-[0_0_10px_#39ff14]' :
            'bg-red-500 shadow-[0_0_10px_#ff0000]'
          }`} 
        />
        <div className="cyberpunk container bg-[color:var(--sol-background)] flex flex-col">
          <span className="text-[color:var(--sol-bright-green)]">
            {connectionStatus === 'checking' ? 'Connecting...' :
            connectionStatus === 'connected' ? 'Connected' :
            'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};