import { useState, useEffect } from 'react';
import { Keypair, Connection } from '@solana/web3.js';
import { EXPLORERS, type ExplorerInfo } from '../../constants/explorers';
import bs58 from 'bs58'; 
import type { NetworkInfo } from '../../types';

interface SettingsPageProps {
  wallet: Keypair | null;
  connection: Connection;
  selectedNetwork: NetworkInfo;
  setSelectedNetwork: (network: NetworkInfo) => void;
}

interface ThemeOption {
  name: string;
  id: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { name: 'Default Dark', id: 'default-dark' },
  { name: 'Light Mode', id: 'light' },
  { name: 'Cyberpunk', id: 'cyberpunk' },
  // Add more themes as needed
];

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  wallet, 
  selectedNetwork,
  setSelectedNetwork 
}) => {
  const [selectedExplorer, setSelectedExplorer] = useState<ExplorerInfo>(EXPLORERS[0]);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [customRpcUrl, setCustomRpcUrl] = useState(selectedNetwork.endpoint);
  const [selectedTheme, setSelectedTheme] = useState<string>('default-dark');
  const [isEditingRpc, setIsEditingRpc] = useState(false);

  useEffect(() => {
    const savedExplorer = localStorage.getItem('preferredExplorer');
    if (savedExplorer) {
      const explorer = EXPLORERS.find(e => e.name === savedExplorer);
      if (explorer) {
        setSelectedExplorer(explorer);
      }
    }
  }, []);

  const handleExplorerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const explorer = EXPLORERS.find(e => e.name === event.target.value);
    if (explorer) {
      setSelectedExplorer(explorer);
      localStorage.setItem('preferredExplorer', explorer.name);
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = event.target.value;
    setSelectedTheme(newTheme);
    localStorage.setItem('preferredTheme', newTheme);
    // Theme application logic would go here
  };

  const handleRpcSubmit = () => {
    if (customRpcUrl !== selectedNetwork.endpoint) {
      setSelectedNetwork({
        ...selectedNetwork,
        endpoint: customRpcUrl
      });
    }
    setIsEditingRpc(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Explorer Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Blockchain Explorer</h2>
          <div className="flex flex-col space-y-2">
            <label htmlFor="explorer" className="text-sm text-gray-300">
              Default Explorer
            </label>
            <select
              id="explorer"
              value={selectedExplorer.name}
              onChange={handleExplorerChange}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
            >
              {EXPLORERS.map((explorer: ExplorerInfo) => (
                <option key={explorer.name} value={explorer.name}>
                  {explorer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RPC URL Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">RPC Settings</h2>
          <div className="flex flex-col space-y-2">
            {isEditingRpc ? (
              <>
                <input
                  type="text"
                  value={customRpcUrl}
                  onChange={(e) => setCustomRpcUrl(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                  placeholder="Enter RPC URL"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleRpcSubmit}
                    className="bg-blue-500 px-4 py-2 rounded-md"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRpc(false);
                      setCustomRpcUrl(selectedNetwork.endpoint);
                    }}
                    className="bg-gray-600 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">{selectedNetwork.endpoint}</span>
                <button
                  onClick={() => setIsEditingRpc(true)}
                  className="bg-gray-700 px-4 py-2 rounded-md"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Theme Settings */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Theme Settings</h2>
          <div className="flex flex-col space-y-2">
            <label htmlFor="theme" className="text-sm text-gray-300">
              Application Theme
            </label>
            <select
              id="theme"
              value={selectedTheme}
              onChange={handleThemeChange}
              className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
            >
              {THEME_OPTIONS.map(theme => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Private Key Export */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Security</h2>
          <button
            onClick={() => setShowPrivateKey(true)}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md"
          >
            Show Private Key
          </button>
        </div>
      </div>

      {/* Private Key Modal */}
      {showPrivateKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Private Key</h3>
            <div className="bg-gray-900 p-4 rounded-md break-all mb-4">
              {wallet ? bs58.encode(wallet.secretKey) : 'No wallet connected'}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPrivateKey(false)}
                className="bg-gray-600 px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};