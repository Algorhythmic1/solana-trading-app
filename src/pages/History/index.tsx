import { useState, useEffect } from 'react';
import { 
  Connection,  
  PublicKey, 
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo 
} from '@solana/web3.js';
import { Navigate, useOutletContext } from 'react-router-dom';
import { ExplorerLink } from '../../components/ExplorerLink';
import { ContextType } from '../../types';
import '../../styles/spinner.css';
import { invoke } from '@tauri-apps/api/core';

interface TokenInfo {
  symbol: string;
  decimals: number;
}

interface ParsedTransaction {
  signature: string;
  timestamp: number;
  status: 'confirmed' | 'failed';
  amount: number;
  type: 'sent' | 'received';
  otherParty: string;
  token: string;
  symbol?: string;
  decimals?: number;
}

export const HistoryPage = () => {
  const { wallet, selectedNetwork } = useOutletContext<ContextType>();

  if (!wallet) {
    return <Navigate to="/dashboard" replace />;
  }

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  const connection = new Connection(selectedNetwork.endpoint, 'finalized');

  const fetchTransactions = async (before?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch signatures
      console.log('Fetching signatures for address:', wallet.publicKey.toString());
      const signatures = await connection.getSignaturesForAddress(
        wallet.publicKey,
        { before, limit: 10 },
        'confirmed'
      );

      console.log('Fetched signatures:', signatures);

      if (signatures.length < 10) {
        setHasMore(false);
      }

      if (signatures.length > 0) {
        setLastSignature(signatures[signatures.length - 1].signature);
      }

      // Fetch transaction details with delay to avoid rate limiting on Helius Free tier
      const parsedTxns: (ParsedTransaction | null)[] = [];
      for (const sig of signatures) {
        console.log('Fetching transaction for signature:', sig.signature);
        try {
          const tx = await connection.getParsedTransaction(
            sig.signature,
            {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          );
          const parsed = await parseTx(tx, sig, wallet.publicKey);
          parsedTxns.push(parsed);
          
          // Wait 200ms between requests (max 5 per second)
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          console.error('Error fetching transaction:', err);
          parsedTxns.push(null);
        }
      }

      setTransactions(prev => [...prev, ...parsedTxns.filter((tx): tx is ParsedTransaction => tx !== null)]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const parseTx = async (
    tx: ParsedTransactionWithMeta | null,
    sigInfo: ConfirmedSignatureInfo,
    walletPubkey: PublicKey
  ): Promise<ParsedTransaction | null> => {
    if (!tx?.meta || !tx.blockTime) return null;
  
    // Check for native SOL transfer
    const solTransfer = tx.transaction.message.instructions.find(
      (ix: any) => 'program' in ix && 'parsed' in ix && 
      ix.program === 'system' && ix.parsed?.type === 'transfer'
    );
  
    // Check for SPL token transfer
    const tokenTransfer = tx.transaction.message.instructions.find(
      (ix: any) => 'program' in ix && 'parsed' in ix && 
      ix.program === 'spl-token' && ix.parsed?.type === 'transfer'
    );
  
    if (solTransfer && 'parsed' in solTransfer) {
      // Handle SOL transfer
      const { info } = solTransfer.parsed;
      const amount = info.lamports / LAMPORTS_PER_SOL;
      const isSender = info.source === walletPubkey.toString();
  
      return {
        signature: sigInfo.signature,
        timestamp: tx.blockTime * 1000,
        status: tx.meta.err ? 'failed' : 'confirmed',
        amount,
        type: isSender ? 'sent' : 'received',
        otherParty: isSender ? info.destination : info.source,
        token: 'SOL'
      };
    } 
    
    if (tokenTransfer && 'parsed' in tokenTransfer) {
      // Handle SPL token transfer
      const { info } = tokenTransfer.parsed;
      const isSender = info.authority === walletPubkey.toString();
      
      // Find token account info from pre/post token balances
      const relevantBalance = tx.meta.preTokenBalances?.find(
        (b: any) => isSender ? 
          b.accountIndex === tx.transaction.message.accountKeys.findIndex(
            (key: any) => key.pubkey.toString() === info.source
          ) :
          b.accountIndex === tx.transaction.message.accountKeys.findIndex(
            (key: any) => key.pubkey.toString() === info.destination
          )
      );
  
      if (!relevantBalance) return null;
  
      const amount = Number(info.amount) / Math.pow(10, relevantBalance.uiTokenAmount.decimals);
      let symbol = '';
      
      try {
        const tokenInfo = await invoke<TokenInfo>('search_tokens_with_address', { 
          mint: relevantBalance.mint 
        });
        symbol = tokenInfo?.symbol || '';
      } catch (error) {
        console.error('Error fetching token info from database:', error);
      }
      
      return {
        signature: sigInfo.signature,
        timestamp: tx.blockTime * 1000,
        status: tx.meta.err ? 'failed' : 'confirmed',
        amount,
        type: isSender ? 'sent' : 'received',
        otherParty: isSender ? info.destination : info.source,
        token: relevantBalance.mint,
        symbol,
        decimals: relevantBalance.uiTokenAmount.decimals
      };
    }
  
    return null;
  };

  useEffect(() => {
    setTransactions([]);
    setLastSignature(null);
    setHasMore(true);
    fetchTransactions();
  }, [wallet.publicKey.toString(), connection.rpcEndpoint]);

  const loadMore = () => {
    if (lastSignature) {
      fetchTransactions(lastSignature);
    }
  };

  return (
    <div className="container cyberpunk min-h-screen p-8 bg-sol-background">
      <h1 className="cyberpunk text-sol-green text-2xl mb-8">Transaction History</h1>

      {error ? (
        <div className="text-sol-error mb-4">{error}</div>
      ) : (
        <div className="space-y-4">
          {loading && transactions.length === 0 ? (
            <div className="spinner-container">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {transactions.map((tx) => (
            <div
              key={tx.signature}
              className="card cyberpunk p-4 hover:border-sol-green/80"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className={`text-lg ${
                    tx.type === 'received' ? 'text-sol-green' : 'text-sol-error'
                  }`}>
                    {tx.type === 'received' ? '+' : '-'}{tx.amount} SOL
                  </span>
                  <span className="text-sm text-sol-text">
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className={`text-sm ${
                  tx.status === 'confirmed' ? 'text-sol-green' : 'text-sol-error'
                }`}>
                  {tx.status}
                </span>
              </div>
              
              <div className="text-sm">
                <div className="flex flex-col">
                  <span className="text-sol-text">
                    {tx.type === 'sent' ? 'To' : 'From'}:
                  </span>
                  <span className="font-mono text-sol-green truncate">
                    {tx.otherParty}
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <ExplorerLink type="tx" value={tx.signature}>
                  <span className="text-sol-green hover:text-sol-green/80">
                    View on Explorer →
                  </span>
                </ExplorerLink>
              </div>
            </div>
          ))}

              {loading && (
                <div className="spinner-container">
                  <div className="spinner" />
                </div>
              )}

              {hasMore && !loading && (
                <button
                  onClick={loadMore}
                  className="cyberpunk w-full"
                >
                  Load More
                </button>
              )}

              {!hasMore && transactions.length > 0 && (
                <div className="text-center text-sol-text py-4">
                  No more transactions to load
                </div>
              )}

              {!loading && transactions.length === 0 && (
                <div className="text-center text-sol-text py-4">
                  No transactions found
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};