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
import { hasEnoughBalance } from '../../utils/hasSufficientBalance';


export const SendPage = () => {
  const { wallet, selectedNetwork, } = useOutletContext<ContextType>();

  if (!wallet) {
    return <Navigate to="/dashboard" replace />;
  }

  const [pageLoading, setPageLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenWithBalance | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeSolBalance, setNativeSolBalance] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTx, setPendingTx] = useState<VersionedTransaction | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleFetchTokens = async () => {
    if (!wallet) return;
    
    try {
      console.log('Fetching token balances...');
      const tokens = await fetchTokenBalances({
        wallet,
        selectedNetwork,
        setBalance: setNativeSolBalance,
        setLoading: setPageLoading
      });
      console.log('Fetched tokens:', tokens);
      setWalletTokens(tokens);
    } catch (error) {
      console.error('Failed to fetch token balances:', error);
      setWalletTokens([]);
    }
  };

  useEffect(() => {
    const estimateFee = async () => {
      if (!wallet || !recipient || !amount || !token) {
        setEstimatedFee(null);
        return;
      }

      try {
        const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
        // Create a dummy transaction to estimate fees
        const recipientPubKey = new PublicKey(recipient);
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
        const message = token.address === 'native'
          ? new TransactionMessage({
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
          : // Add token transfer message compilation here
            null;

        if (message) {
          const { value: fee } = await connection.getFeeForMessage(message, 'confirmed');
          if (fee !== null) {
            setEstimatedFee(fee / LAMPORTS_PER_SOL);
          }
        }
      } catch (error) {
        console.error('Failed to estimate fee:', error);
        setEstimatedFee(null);
      }
    };

    estimateFee();
  }, [wallet, recipient, amount, token, selectedNetwork]);

  useEffect(() => {
    const handleFetchTokens = async () => {
      if (!wallet) return;
      
      try {
        console.log('Fetching token balances...');
        const tokens = await fetchTokenBalances({
          wallet,
          selectedNetwork,
          setBalance: setNativeSolBalance,
          setLoading: setPageLoading
        });
        console.log('Fetched tokens:', tokens);
        setWalletTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch token balances:', error);
        setWalletTokens([]);
      }
    };

    handleFetchTokens();
  }, [wallet, selectedNetwork]);

  useEffect(() => {
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

      if (token.address === 'native') {
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
      } else {
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
      }
    } catch (err) {
      setError('Invalid recipient address');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTx) return;
    setSending(true);
  
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
  
      // Refresh balances after successful transaction
      await handleFetchTokens();
  
      // Clear form on success
      setRecipient('');
      setAmount('');
      setShowConfirmation(false);
      setPendingTx(null);
      
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send transaction');
    } finally {
      setSending(false);
    }
  };

  // Modify the balance display to handle native SOL
  const getBalanceDisplay = () => {
    if (!token) return null;

    if (token.address === 'native') {
      // Get native SOL balance from token.balance
      return (
        <div className={`text-sm mt-1 ${nativeSolBalance === null || nativeSolBalance === 0 ? 'text-sol-error' : 'text-[color:var(--sol-green)]'}`}>
          {nativeSolBalance === null 
            ? 'Loading...'
            : nativeSolBalance === 0
              ? 'No balance to send'
              : `Balance: ${nativeSolBalance.toFixed(4)} SOL`
          }
        </div>
      );
    }

    return (
      <div className={`text-sm mt-1 ${token.balance === '0' ? 'text-sol-error' : 'text-[color:var(--sol-green)]'}`}>
        {token.balance === '0' 
          ? 'No balance to send'
          : `Balance: ${(Number(token.balance) / Math.pow(10, token.decimals)).toFixed(4)} ${token.symbol}`
        }
      </div>
    );
  };

  const handleMaxAmount = () => {
    if (token?.balance) {
      setAmount((Number(token.balance) / Math.pow(10, token.decimals)).toString());
    }
  };

  return (
    <div className="container cyberpunk min-h-screen p-4 bg-sol-background">
      
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 bg-sol-card p-8 rounded-lg">
        <div>
          <label className="block text-sol-green mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            className="cyberpunk w-full text-sm text-[color:var(--sol-text)]"
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
              console.log('Send page - onSelect called with:', selectedToken);
              if (selectedToken.address === 'native') {
                setToken({
                  ...selectedToken,
                  mint: selectedToken.address,
                  image: selectedToken.logoURI || null,
                  balance: '0'  // Will be updated from wallet.lamports
                } as TokenWithBalance);
              } else {
                const withBalance = walletTokens.find(t => t.address === selectedToken.address);
                setToken({
                  ...selectedToken,
                  mint: selectedToken.address,
                  image: selectedToken.logoURI || null,
                  balance: withBalance?.balance || '0'
                } as TokenWithBalance);
              }            
            }}
            placeholder="Select token to send..."
          />
          {getBalanceDisplay()}
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
          disabled={
            loading || 
            !recipient || 
            !amount || 
            !token || 
            !hasEnoughBalance({
              token, 
              amount, 
              nativeSolBalance, 
              estimatedFee: estimatedFee || 0
            }
            )
          }
        >
          {pageLoading ? 'Loading...' : 
          sending ?'Sending...' : 
          'Send'}
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
            sol: token?.address === 'native' ? -Number(amount) : 0,
            tokens: token?.address === 'native' ? [] : [
              {
                mint: token?.address || '',
                symbol: token?.symbol || '',
                amount: -Number(amount),
                decimals: token?.decimals || 0
              }
            ]
          }}
          connection={new Connection(selectedNetwork.endpoint, 'confirmed')}
        />
      )}
    </div>
  );
};