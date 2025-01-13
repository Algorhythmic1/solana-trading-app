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
  tokens?: Array<{
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
  }>;
}

export const TransactionConfirmation = ({
  transaction,
  onClose,
  onConfirm,
  expectedChanges = { sol: 0 },
  connection
}: TransactionConfirmationProps) => {
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!transaction) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Transaction:', {
          accounts: transaction.message.staticAccountKeys,
          instructions: transaction.message.compiledInstructions
        });

        // Get current balance
        const payer = transaction.message.staticAccountKeys[0];
        console.log('Fetching balance for:', payer.toString());
        const balance = await connection.getBalance(payer);
        setCurrentBalance(balance / LAMPORTS_PER_SOL);

        // Get fee estimate
        console.log('Getting fee estimate');
        const { value: estimatedFee } = await connection.getFeeForMessage(
          transaction.message,
          'confirmed'
        );
        
        console.log('Fee estimate:', estimatedFee);
        if (estimatedFee === null) {
          throw new Error('Failed to get fee estimate');
        }

        setEstimatedFee(estimatedFee / LAMPORTS_PER_SOL);

      } catch (err) {
        console.error('Error fetching transaction details:', err);
        setError('Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transaction, connection]);

  if (!transaction) return null;

  const getTransactionAmount = (transaction: VersionedTransaction): number => {
    try {
      const instruction = transaction.message.staticAccountKeys[1];
      return instruction ? Number(instruction) : 0;
    } catch (error) {
      console.error('Error getting transaction amount:', error);
      return 0;
    }
  };

  const afterBalance = currentBalance !== null && estimatedFee !== null
    ? currentBalance - getTransactionAmount(transaction) - estimatedFee
    : null;

  const hasInsufficientFunds = afterBalance !== null && afterBalance < 0;

  const renderChanges = () => (
    <div className="space-y-2">
      {expectedChanges?.sol !== 0 && (
        <div className="flex justify-between">
          <span>SOL Balance Change</span>
          <span className={expectedChanges?.sol > 0 ? 'text-green-500' : 'text-red-500'}>
            {expectedChanges?.sol > 0 ? '+' : ''}{expectedChanges?.sol} SOL
          </span>
        </div>
      )}
      {expectedChanges?.tokens?.map(token => (
        <div key={token.mint} className="flex justify-between">
          <span>{token.symbol} Balance Change</span>
          <span className={token.amount > 0 ? 'text-green-500' : 'text-red-500'}>
            {token.amount > 0 ? '+' : ''}{token.amount} {token.symbol}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="card cyberpunk">
      <h2 className="cyberpunk text-xl mb-4">Confirm Transaction</h2>
      
      {loading ? (
        <div className="text-center text-sol-text py-4">
          Loading transaction details...
        </div>
      ) : error ? (
        <div className="text-sol-error py-4">{error}</div>
      ) : (
        <div className="space-y-4">
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
            <div className="flex justify-between">
              <span className="text-sol-text">Amount</span>
              <span className="text-sol-green">{expectedChanges.sol} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sol-text">Network Fee</span>
              <span className="text-sol-green">≈ {estimatedFee?.toFixed(6)} SOL</span>
            </div>
          </div>

          <div className="border border-sol-green/20 rounded p-4">
            {renderChanges()}
          </div>

          <div className="border border-sol-green/20 rounded p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sol-text">Current Balance</span>
              <span className="text-sol-green">{currentBalance?.toFixed(6)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sol-text">Balance After</span>
              <span className={`${hasInsufficientFunds ? 'text-sol-error' : 'text-sol-green'}`}>
                {afterBalance?.toFixed(6)} SOL
              </span>
            </div>
          </div>

          {hasInsufficientFunds && (
            <div className="text-sol-error text-sm">
              Insufficient funds for this transaction
            </div>
          )}

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
              disabled={loading || hasInsufficientFunds}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};