import { FC } from 'react';
import { EXPLORERS } from '../../constants/explorers';
import { open } from '@tauri-apps/plugin-shell';

interface TransactionResultProps {
  signature: string;
  success: boolean;
  error?: string;
  onClose: () => void;
  network: string;  // 'mainnet' | 'devnet' | etc.
}

export const TransactionResultModal: FC<TransactionResultProps> = ({
  signature,
  success,
  error,
  onClose,
  network
}) => {
  const getExplorerUrl = () => {
    // Get preferred explorer from localStorage or use default
    const savedExplorer = localStorage.getItem('preferredExplorer');
    const explorer = EXPLORERS.find(e => e.name === savedExplorer) || EXPLORERS[0];
    
    // Don't add network parameter for mainnet-beta
    const networkParam = network === 'mainnet-beta' ? '' : `${explorer.networkParam}${network}`;
    
    return `${explorer.url}${explorer.txPath}/${signature}${networkParam}`;
  };

  const openExplorer = async () => {
    try {
      await open(getExplorerUrl());
    } catch (err) {
      console.error('Failed to open explorer:', err);
    }
  };

  return (
    <div className="card cyberpunk w-full max-w-md">
      <div className="space-y-4">
        <div className={`text-xl font-bold ${success ? 'text-sol-green' : 'text-sol-error'}`}>
          {success ? 'Transaction Successful' : 'Transaction Failed'}
        </div>

        {success ? (
          <div className="space-y-4">
            <p className="text-sol-text">Your transaction has been confirmed!</p>
            <button
              onClick={openExplorer}
              className="cyberpunk w-full"
            >
              View on Solana Explorer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sol-error">{error || 'An error occurred while processing your transaction.'}</p>
            <div className="text-sm text-sol-text break-all">
              Transaction ID: {signature}
            </div>
            <button
              onClick={openExplorer}
              className="cyberpunk w-full"
            >
              View Error Details on Explorer
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="cyberpunk modal-btn w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
};