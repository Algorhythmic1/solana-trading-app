import { useState, useEffect } from 'react';
import { 
  Connection, 
  LAMPORTS_PER_SOL, 
  PublicKey,
  SystemProgram,
  Transaction
} from '@solana/web3.js';

interface TransactionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromAddress: PublicKey;
  toAddress: PublicKey;
  amount: number;
  connection: Connection;
}

export const TransactionConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  fromAddress,
  toAddress,
  amount,
  connection,
}: TransactionConfirmationProps) => {
  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get current balance
        const balance = await connection.getBalance(fromAddress);
        setCurrentBalance(balance / LAMPORTS_PER_SOL);

        // Create a sample transaction to estimate fees
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: fromAddress,
            toPubkey: toAddress,
            lamports: amount * LAMPORTS_PER_SOL,
          })
        );

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromAddress;

        // Create transaction message
        const message = transaction.compileMessage();
        
        // Get fee estimate
        const fee = await connection.getFeeForMessage(message);
        
        if (fee.value === null) {
          throw new Error('Failed to get fee estimate');
        }

        setEstimatedFee(fee.value / LAMPORTS_PER_SOL);

      } catch (err) {
        console.error('Error fetching transaction details:', err);
        setError('Failed to fetch transaction details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, connection, fromAddress, toAddress, amount]);

  if (!isOpen) return null;

  const afterBalance = currentBalance !== null && estimatedFee !== null
    ? currentBalance - amount - estimatedFee
    : null;

  const hasInsufficientFunds = afterBalance !== null && afterBalance < 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border-2 border-[#39ff14] p-6 rounded-lg max-w-md w-full">
        <h2 className="text-[#39ff14] text-xl mb-4">Confirm Transaction</h2>
        
        {loading ? (
          <div className="text-center py-4">Loading transaction details...</div>
        ) : error ? (
          <div className="text-red-400 py-4">{error}</div>
        ) : (
          <div className="space-y-4">
            <div className="border border-[#39ff14]/20 rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">From</span>
                <span className="text-sm font-mono text-[#39ff14] truncate max-w-[200px]">
                  {fromAddress.toString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">To</span>
                <span className="text-sm font-mono text-[#39ff14] truncate max-w-[200px]">
                  {toAddress.toString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-[#39ff14]">{amount} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network Fee</span>
                <span className="text-[#39ff14]">≈ {estimatedFee?.toFixed(6)} SOL</span>
              </div>
            </div>

            <div className="border border-[#39ff14]/20 rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Balance</span>
                <span className="text-[#39ff14]">{currentBalance?.toFixed(6)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Balance After</span>
                <span className={`${hasInsufficientFunds ? 'text-red-400' : 'text-[#39ff14]'}`}>
                  {afterBalance?.toFixed(6)} SOL
                </span>
              </div>
            </div>

            {hasInsufficientFunds && (
              <div className="text-red-400 text-sm">
                Insufficient funds for this transaction
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={onClose}
                className="cyberpunk flex-1"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="cyberpunk flex-1"
                disabled={loading || hasInsufficientFunds}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};