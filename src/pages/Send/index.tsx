import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Connection,
  Keypair,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { TransactionConfirmation } from '../../components/modals/TransactionConfirmation';

interface SendPageProps {
  wallet: Keypair | null;
  connection: Connection;
}

export const SendPage = ({ wallet, connection }: SendPageProps) => {
  if (!wallet) {
    return <Navigate to="/dashboard" replace />;
  }

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTx, setPendingTx] = useState<{
    recipient: PublicKey;
    amount: number;
  } | null>(null);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!validateAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    try {
      const recipientPubKey = new PublicKey(recipient);
      setPendingTx({
        recipient: recipientPubKey,
        amount: parsedAmount
      });
      setShowConfirmation(true);
    } catch (err) {
      setError('Invalid recipient address');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTx) return;
    setLoading(true);
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    try {
      const recipientPubKey = new PublicKey(recipient);
      const lamports = parsedAmount * LAMPORTS_PER_SOL;

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipientPubKey,
          lamports,
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet],
        { commitment: 'confirmed' }
      );

      console.log('Transaction confirmed:', signature);

      // Clear form on success
      setRecipient('');
      setAmount('');
      setShowConfirmation(false);
      setPendingTx(null);
      
      // TODO: Show success message or redirect to transaction history
      
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-[#39ff14] text-2xl mb-8">Send SOL</h1>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <div>
          <label className="block text-[#39ff14] mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            className="cyberpunk w-full"
            placeholder="Enter Solana address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-[#39ff14] mb-2">
            Amount (SOL)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            className="cyberpunk w-full"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="cyberpunk w-full"
          disabled={loading || !recipient || !amount}
        >
          {loading ? 'Sending...' : 'Send SOL'}
        </button>
      </form>
      {showConfirmation && pendingTx && (
        <TransactionConfirmation
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false);
            setPendingTx(null);
          }}
          onConfirm={handleConfirmTransaction}
          fromAddress={wallet.publicKey}
          toAddress={pendingTx.recipient}
          amount={pendingTx.amount}
          connection={connection}
        />
      )}
    </div>
  );
};