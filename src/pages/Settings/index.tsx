import { useState } from 'react';
import { EXPLORERS } from '../../constants/explorers';
import bs58 from 'bs58'; 
import { useTheme, type ThemeName } from '../../hooks/useTheme';
import { useOutletContext } from 'react-router-dom';
import type { ContextType } from '../../types';

const THEME_OPTIONS = [
  { name: 'Cyberpunk', id: 'cyberpunk' },
  { name: 'Solana', id: 'solana' },
  { name: 'Matrix', id: 'matrix' },
] as const;


export const SettingsPage = () => {
  const { wallet, selectedNetwork, setSelectedNetwork } = useOutletContext<ContextType>();
  const { theme, setTheme } = useTheme();
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Initialize from localStorage with proper typing
  const [selectedExplorer, setSelectedExplorer] = useState(() => {
    const savedExplorer = localStorage.getItem('preferredExplorer');
    if (savedExplorer) {
      const explorer = EXPLORERS.find(e => e.name === savedExplorer);
      return explorer || EXPLORERS[0];
    }
    return EXPLORERS[0];
  });

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('apiKey') || '';
  });
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleApiKeySubmit = () => {
    localStorage.setItem('apiKey', apiKey);
    setIsEditingApiKey(false);
    setShowApiKey(false);
  };
  
  // RPC settings
  const [customRpcUrl, setCustomRpcUrl] = useState(selectedNetwork.endpoint);
  const [isEditingRpc, setIsEditingRpc] = useState(false);

  const handleExplorerChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Explorer changed:', event.target.value); 
    const explorer = EXPLORERS.find(e => e.name === event.target.value);
    if (explorer) {
      setSelectedExplorer(explorer);
      localStorage.setItem('preferredExplorer', explorer.name);
    }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('Theme changed:', event.target.value);
    const newTheme = event.target.value as ThemeName;
    setTheme(newTheme);
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

  const maskApiKey = (url: string): string => {
    try {
      // Parse the URL and get the search params
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      // If there's an api-key parameter, mask it
      if (params.has('api-key')) {
        const key = params.get('api-key');
        if (key) {
          const maskedKey = `*************`;
          params.set('api-key', maskedKey);
          // Reconstruct the URL with masked key
          urlObj.search = params.toString();
          return urlObj.toString();
        }
      }
      
      return url;
    } catch (e) {
      // If URL parsing fails, return original
      return url;
    }
  };
  
  return (
    <div className="container bg-sol-background cyberpunk min-h-screen p-8">
      <h1 className="cyberpunk text-sol-green text-2xl mb-6">Settings</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Explorer Settings */}
        <div className="card cyberpunk">
          <h2 className="cyberpunk text-xl mb-4">Blockchain Explorer</h2>
          <div className="flex flex-col space-y-2">
            <select
              id="explorer"
              value={selectedExplorer.name}
              onChange={handleExplorerChange}
              className="bg-sol-background cyberpunk w-full"
            >
              {EXPLORERS.map((explorer) => (
                <option key={explorer.name} value={explorer.name}>
                  {explorer.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="card cyberpunk">
          <h2 className="cyberpunk text-xl mb-4">Theme Settings</h2>
          <div className="flex flex-col space-y-2">
            <select
              id="theme"
              value={theme}
              onChange={handleThemeChange}
              className="bg-sol-background cyberpunk w-full"
            >
              {THEME_OPTIONS.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/*TO DO: clean this up so the API key is not in the rpc url*/}
        {/* RPC URL Settings */}
        <div className="card cyberpunk">
          <h2 className="cyberpunk text-xl mb-4">Set RPC URL</h2>
          <div className="flex flex-col space-y-2">
            {isEditingRpc ? (
              <>
                <input
                  type="text"
                  value={customRpcUrl}
                  onChange={(e) => setCustomRpcUrl(e.target.value)}
                  className="cyberpunk w-full"
                  placeholder="Enter RPC URL"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleRpcSubmit}
                    className="cyberpunk modal-btn"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRpc(false);
                      setCustomRpcUrl(selectedNetwork.endpoint);
                    }}
                    className="cyberpunk modal-btn"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col space-y-2">
                <span className="text-sol-green break-all">{maskApiKey(selectedNetwork.endpoint)}</span>
                <button
                  onClick={() => setIsEditingRpc(true)}
                  className="cyberpunk modal-btn"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Private Key Export */}
        <div className="card cyberpunk">
          <h2 className="cyberpunk text-xl mb-4">Wallet Security</h2>
          <div className="flex justify-center">
            <button
              onClick={() => setShowPrivateKey(true)}
              className="cyberpunk modal-btn hover:text-sol-error/80"
              style={{ '--button-text-color': 'var(--sol-error)' } as React.CSSProperties}
            >
              Show Private Key
            </button>
          </div>
        </div>
      </div>

      {/* API Key Settings */}
      <div className="card cyberpunk">
        <h2 className="cyberpunk text-xl mb-4">API Key</h2>
        <div className="flex flex-col space-y-2">
          {isEditingApiKey ? (
            <>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="cyberpunk w-full"
                placeholder="Enter API Key"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleApiKeySubmit}
                  className="cyberpunk modal-btn"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingApiKey(false);
                    setApiKey(localStorage.getItem('apiKey') || '');
                  }}
                  className="cyberpunk modal-btn"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sol-text">
                  {apiKey ? (
                    showApiKey ? (
                      apiKey
                    ) : (
                      '************'
                    )                    ) : (
                     'No API key set'
                  )}
                </span>
                {apiKey && (
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="cyberpunk text-sm px-2 py-1"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                )}                </div>
              <button
                onClick={() => setIsEditingApiKey(true)}
                className="cyberpunk modal-btn"
              >
                {apiKey ? 'Edit' : 'Add API Key'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Private Key Modal */}
      {showPrivateKey && (
        <div className="fixed inset-0 bg-sol-background/50 flex items-center justify-center">
          <div className="card cyberpunk max-w-lg w-full mx-4">
            <h3 className="cyberpunk text-xl mb-4">Private Key</h3>
            <div className="cyberpunk bg-sol-card p-4 rounded-md break-all mb-4">
              {wallet ? bs58.encode(wallet.secretKey) : 'No wallet connected'}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowPrivateKey(false)}
                className="cyberpunk modal-btn"
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