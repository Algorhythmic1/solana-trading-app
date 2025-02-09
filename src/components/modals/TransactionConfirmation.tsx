import { useState, useEffect } from 'react';
import { 
  Connection, 
  LAMPORTS_PER_SOL, 
  VersionedTransaction 
} from '@solana/web3.js';

interface TransactionConfirmationProps {
  transaction: VersionedTransaction;
  onClose: () => void;
  onConfirm: () => void;
  expectedChanges?: ExpectedChanges;
  connection: Connection;
}

interface ExpectedChanges {
  sol: number;
  currentSolBalance: number;
  tokens?: Array<{
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
    currentBalance: number;
  }>;
}

export const TransactionConfirmation = ({
  transaction,
  onClose,
  onConfirm,
  expectedChanges = { sol: 0, currentSolBalance: 0 },
  connection
}: TransactionConfirmationProps) => {
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const estimateFee = async () => {
      if (!transaction) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { value: fee } = await connection.getFeeForMessage(
          transaction.message,
          'confirmed'
        );
        
        if (fee === null) {
          throw new Error('Failed to get fee estimate');
        }

        setEstimatedFee(fee / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error('Error estimating fee:', err);
        setError('Failed to estimate transaction fee');
      } finally {
        setLoading(false);
      }
    };

    estimateFee();
  }, [transaction, connection]);

  const afterSolBalance = estimatedFee !== null
    ? expectedChanges.currentSolBalance - 
      (expectedChanges.sol < 0 ? Math.abs(expectedChanges.sol) : 0) - 
      estimatedFee
    : null;

  const afterTokenBalance = expectedChanges.tokens?.[0]
    ? expectedChanges.tokens[0].currentBalance + expectedChanges.tokens[0].amount
    : null;

  const hasInsufficientFunds = afterSolBalance !== null && afterSolBalance < 0;
  const hasInsufficientTokens = afterTokenBalance !== null && afterTokenBalance < 0;

  if (!transaction) return null;

  return (
    <div className="card cyberpunk w-full max-w-[480px] min-h-[480px]">
      <h2 className="cyberpunk text-xl mb-4">Confirm Transaction</h2>
      
      {loading ? (
        <div className="text-center text-sol-text py-4 flex-1 flex items-center justify-center">
          Loading transaction details...
        </div>
      ) : error ? (
        <div className="text-sol-error py-4">{error}</div>
      ) : (
        <div className="space-y-4 h-full">
          {/* Transaction Details */}
          <div className="border border-sol-green/20 rounded p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sol-text">From</span>
              <span className="text-sm font-mono text-sol-green truncate max-w-[200px]">
                {transaction.message.staticAccountKeys[0].toString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sol-text">To</span>
              <span className="text-sm font-mono text-sol-green truncate max-w-[200px]">
                {transaction.message.staticAccountKeys[1].toString()}
              </span>
            </div>
            
            {/* Show amount based on token type */}
            {expectedChanges.tokens ? (
              <div className="flex justify-between">
                <span className="text-sol-text">Amount</span>
                <span className="text-sol-green">
                  {Math.abs(expectedChanges.tokens[0].amount)} {expectedChanges.tokens[0].symbol}
                </span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-sol-text">Amount</span>
                <span className="text-sol-green">{Math.abs(expectedChanges.sol)} SOL</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sol-text">Network Fee</span>
              <span className="text-sol-green">≈ {estimatedFee?.toFixed(6)} SOL</span>
            </div>
          </div>
  
          {/* Balance Changes */}
          <div className="border border-sol-green/20 rounded p-4 space-y-2">
            {/* SOL Balance (always show) */}
            <div className="flex justify-between">
              <span className="text-sol-text">Current SOL Balance</span>
              <span className="text-sol-green">{expectedChanges.currentSolBalance.toFixed(6)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sol-text">SOL Balance After</span>
              <span className={`${hasInsufficientFunds ? 'text-sol-error' : 'text-sol-green'}`}>
                {afterSolBalance?.toFixed(6)} SOL
              </span>
            </div>
  
            {/* Token Balance (show only for token transfers) */}
            {expectedChanges.tokens?.[0] && (
              <>
                <div className="border-t border-sol-green/20 my-2" />
                <div className="flex justify-between">
                  <span className="text-sol-text">Current {expectedChanges.tokens[0].symbol} Balance</span>
                  <span className="text-sol-green">
                    {expectedChanges.tokens[0].currentBalance.toFixed(expectedChanges.tokens[0].decimals)} {expectedChanges.tokens[0].symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sol-text">{expectedChanges.tokens[0].symbol} Balance After</span>
                  <span className={`${hasInsufficientTokens ? 'text-sol-error' : 'text-sol-green'}`}>
                    {afterTokenBalance?.toFixed(expectedChanges.tokens[0].decimals)} {expectedChanges.tokens[0].symbol}
                  </span>
                </div>
              </>
            )}
          </div>
  
          {/* Error Messages */}
          {(hasInsufficientFunds || hasInsufficientTokens) && (
            <div className="text-sol-error text-sm">
              Insufficient {hasInsufficientFunds ? 'SOL' : expectedChanges.tokens?.[0].symbol} for this transaction
            </div>
          )}
  
          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="cyberpunk modal-btn flex-1"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="cyberpunk modal-btn flex-1"
              disabled={Boolean(loading || hasInsufficientFunds || hasInsufficientTokens || error)}
            >
              {loading ? 'Loading...' : 
               hasInsufficientFunds ? 'Insufficient SOL' :
               hasInsufficientTokens ? `Insufficient ${expectedChanges.tokens?.[0].symbol}` :
               'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};