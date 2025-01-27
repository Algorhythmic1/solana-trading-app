import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Connection,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import { TransactionConfirmation } from '../../components/modals/TransactionConfirmation';
import { TokenSelector } from '../../components/TokenSelector';
import { TokenWithBalance, ContextType } from '../../types';
import { fetchTokenBalances } from '../../utils/fetchTokenBalances';


export const SendPage = () => {
  const { wallet, selectedNetwork, } = useOutletContext<ContextType>();

  if (!wallet) {
    return <Navigate to="/dashboard" replace />;
  }

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenWithBalance | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTx, setPendingTx] = useState<VersionedTransaction | null>(null);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const handleFetchTokens = async () => {
      if (!wallet) return;
      
      try {
        const tokens = await fetchTokenBalances({
          wallet,
          selectedNetwork,
          setLoading
        });
        setWalletTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch token balances:', error);
        setWalletTokens([]);
      }
    };

    handleFetchTokens();
  }, [wallet, selectedNetwork]);

  const handleSubmit = async (e: React.FormEvent) => {

    const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
    e.preventDefault();
    setError(null);

    if (!validateAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    if (!token) {
      setError('No token selected');
      return;
    }

    try {
      const recipientPubKey = new PublicKey(recipient);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
      
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      const transaction = new VersionedTransaction(
        new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: recipientPubKey,
              lamports,
            })
          ],
        }).compileToV0Message()
      );

      setPendingTx(transaction);
      setShowConfirmation(true);
    } catch (err) {
      setError('Invalid recipient address');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTx) return;
    setLoading(true);

    const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
    
    try {
      // Sign and send the versioned transaction
      pendingTx.sign([wallet]);
      const signature = await connection.sendTransaction(pendingTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });

      // Confirm transaction
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      });

      console.log('Transaction confirmed:', signature);

      // Clear form on success
      setRecipient('');
      setAmount('');
      setShowConfirmation(false);
      setPendingTx(null);
      
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (token?.balance) {
      setAmount((Number(token.balance) / Math.pow(10, token.decimals)).toString());
    }
  };

  return (
    <div className="container cyberpunk min-h-screen p-8 bg-sol-background">
      <h1 className="cyberpunk text-sol-green text-4xl mb-8">Send SOL</h1>
      
      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        <div>
          <label className="block text-sol-green mb-2">
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

        <div className="flex-1">
          <TokenSelector
            value={token || undefined}
            onSelect={(selectedToken) => {
              const withBalance = walletTokens.find(t => t.address === selectedToken.address);
              if (withBalance) {
                setToken(withBalance);
              }
            }}
            placeholder="Select token to send..."
          />
          {token?.balance && (
            <div className="text-sm text-[color:var(--sol-green)] mt-1">
              Balance: {(Number(token.balance) / Math.pow(10, token.decimals)).toFixed(4)}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sol-green mb-2">
            Amount
          </label>
          <input
            type="number"
            step="any"
            min="0"
            className="cyberpunk-compact w-full"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
          {token?.balance && (
            <button
              onClick={handleMaxAmount}
              className="cyberpunk text-xs py-0.5"
            >
              Max
            </button>
          )}
        </div>

        {error && (
          <div className="text-sol-error text-sm">
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
          transaction={pendingTx}
          onClose={() => {
            setShowConfirmation(false);
            setPendingTx(null);
          }}
          onConfirm={handleConfirmTransaction}
          expectedChanges={{
            sol: -amount,
            tokens: []
          }}
          connection={new Connection(selectedNetwork.endpoint, 'confirmed')}
        />
      )}
    </div>
  );
};