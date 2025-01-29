import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { 
  PublicKey, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  Connection,
  VersionedTransaction,
  TransactionMessage,
  SendTransactionError,
  ComputeBudgetProgram
} from '@solana/web3.js';
import { TransactionConfirmation } from '../../components/modals/TransactionConfirmation';
import { TokenSelector } from '../../components/TokenSelector';
import { TokenWithBalance, ContextType } from '../../types';
import { fetchTokenBalances } from '../../utils/fetchTokenBalances';
import { hasEnoughBalance } from '../../utils/hasSufficientBalance';
import { 
  createAssociatedTokenAccountInstruction,
  createTransferInstruction, 
  getAssociatedTokenAddressSync 
} from '@solana/spl-token';
import { TransactionResult } from '../../components/modals/TransactionResult';

interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  network: string;
}

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
  const [error, setError] = useState<string | null>(null);
  const [nativeSolBalance, setNativeSolBalance] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTx, setPendingTx] = useState<VersionedTransaction | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

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

  const handleValidateAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const connection = new Connection(selectedNetwork.endpoint, 'confirmed');

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
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      
      if (token.address === 'native') {
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

        const transaction = new VersionedTransaction(
          new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: recipientPubKey,
                lamports: lamports,
              })
            ],
          }).compileToV0Message()
        );

        setPendingTx(transaction);
        setShowConfirmation(true);
      } else {
        // SPL Token Transfer
        const mintPubkey = new PublicKey(token.mint);
        const fromTokenAccount = await getAssociatedTokenAddressSync(
          mintPubkey,
          wallet.publicKey,
        );

        const toTokenAccount = await getAssociatedTokenAddressSync(
          mintPubkey,
          recipientPubKey,
        );

        // Check if recipient token account exists
        const recipientAccountInfo = await connection.getAccountInfo(toTokenAccount);
        
        // Calculate token amount with decimals
        const tokenAmount = Math.round(Number(amount) * Math.pow(10, token.decimals));

        // Build instructions array
        const instructions = [];

        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 10000,
        });

        // Add ATA creation instruction if recipient account doesn't exist
        if (!recipientAccountInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey, // payer
              toTokenAccount,   // ata
              recipientPubKey,  // owner
              mintPubkey        // mint
            )
          );
        }
        instructions.push(
          createTransferInstruction(
            fromTokenAccount,    // source
            toTokenAccount,      // destination
            wallet.publicKey,    // owner
            tokenAmount         // amount
          )
        );

        instructions.push(addPriorityFee);

        const transaction = new VersionedTransaction(
          new TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions
          }).compileToV0Message()
        );

        setPendingTx(transaction);
        setShowConfirmation(true);
      }
    } catch (err) {
      console.error('Error creating token transfer:', err);
      setError('Failed to create token transfer');
    }
  };

  const handleConfirmTransaction = async () => {
    if (!pendingTx) return;
    setSending(true);
  
    const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
    
    try {
      // Log original transaction for debugging
      console.log('Original transaction:', {
        instructions: pendingTx.message.compiledInstructions,
        accounts: pendingTx.message.staticAccountKeys.map(key => key.toString())
      });
  
      // Get fresh blockhash immediately before sending
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      console.log('New blockhash:', latestBlockhash.blockhash);
      
      // Update transaction with fresh blockhash
      const messageV0 = pendingTx.message;
      const newMessage = new TransactionMessage({
        payerKey: wallet.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: messageV0.compiledInstructions.map(ix => ({
          programId: messageV0.staticAccountKeys[ix.programIdIndex],
          accounts: ix.accountKeyIndexes.map(idx => messageV0.staticAccountKeys[idx]),
          data: Buffer.from(ix.data),
          keys: ix.accountKeyIndexes.map(idx => ({
            pubkey: messageV0.staticAccountKeys[idx],
            isSigner: messageV0.isAccountSigner(idx),
            isWritable: messageV0.isAccountWritable(idx)
          }))
        }))
      }).compileToV0Message();
  
      // Log new message for debugging
      console.log('New message:', {
        instructions: newMessage.compiledInstructions,
        accounts: newMessage.staticAccountKeys.map(key => key.toString())
      });
  
      const newTransaction = new VersionedTransaction(newMessage);
      newTransaction.sign([wallet]);
      console.log('Transaction signed. Signatures:', newTransaction.signatures);
  
      // Simulate before sending
      const simulation = await connection.simulateTransaction(newTransaction);
      console.log('Simulation result:', simulation);
  
      if (simulation.value.err) {
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
  
      // Send immediately after successful simulation
      const signature = await connection.sendTransaction(newTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
  
      console.log('Transaction sent:', signature);
  
      // Wait for confirmation with the same blockhash
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
  
      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + confirmation.value.err.toString());
      }
  
      console.log('Transaction confirmed:', signature);
      await handleFetchTokens();
  
      setTransactionResult({
        signature,
        success: true,
        network: selectedNetwork.name
      });
  
      // Clear form on success
      setRecipient('');
      setAmount('');
  
    } catch (err) {
      console.error('Send error type:', err instanceof Error ? err.constructor.name : 'Unknown');
      console.error('Send error full details:', err);
  
      if (err instanceof SendTransactionError) {
        try {
          const logs = await err.getLogs(connection);
          console.error('Transaction simulation logs:', logs);
          throw new Error(`Simulation failed: ${logs ? logs.join('\n') : err.message}`);
        } catch (logError) {
          console.error('Error getting logs:', logError);
          throw err;
        }
      }
  
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setTransactionResult({
        signature: '',
        success: false,
        error: errorMessage,
        network: selectedNetwork.name
      });
  
    } finally {
      setSending(false);
      setShowConfirmation(false);
      setPendingTx(null);
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
      
      <form onSubmit={handleValidateAndConfirm} className="max-w-2xl space-y-6 bg-sol-card p-8 rounded-lg">
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
            disabled={pageLoading}
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
            disabled={pageLoading}
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
            pageLoading || 
            !recipient || 
            !amount || 
            !token || 
            !hasEnoughBalance({
              token, 
              amount, 
              nativeSolBalance
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
            currentSolBalance: nativeSolBalance || 0,
            tokens: token?.address === 'native' ? undefined : [
              {
                mint: token?.address || '',
                symbol: token?.symbol || '',
                amount: -Number(amount),
                decimals: token?.decimals || 0,
                currentBalance: Number(token?.balance) / Math.pow(10, token?.decimals || 0)
              }
            ]
          }}
          connection={new Connection(selectedNetwork.endpoint, 'confirmed')}
        />
      )}

      {transactionResult && (
        <TransactionResult
          signature={transactionResult.signature}
          success={transactionResult.success}
          error={transactionResult.error}
          onClose={() => setTransactionResult(null)}
          network={selectedNetwork.name}
        />
      )}
    </div>
  );
};