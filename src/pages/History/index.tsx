import { useState, useEffect } from 'react';
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo 
} from '@solana/web3.js';
import { Navigate } from 'react-router-dom';
import { ExplorerLink } from '../../components/ExplorerLink';

interface HistoryPageProps {
  wallet: Keypair | null;
  connection: Connection;
}

interface ParsedTransaction {
  signature: string;
  timestamp: number;
  status: 'confirmed' | 'failed';
  amount: number;
  type: 'sent' | 'received';
  otherParty: string;
}

export const HistoryPage = ({ wallet, connection }: HistoryPageProps) => {
  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  const fetchTransactions = async (before?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch signatures
      const signatures = await connection.getSignaturesForAddress(
        wallet.publicKey,
        { before, limit: 10 },
        'confirmed'
      );

      if (signatures.length < 10) {
        setHasMore(false);
      }

      if (signatures.length > 0) {
        setLastSignature(signatures[signatures.length - 1].signature);
      }

      // Fetch transaction details
      const parsedTxns = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await connection.getParsedTransaction(
            sig.signature, 
            {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          );
          return parseTx(tx, sig, wallet.publicKey);
        })
      );

      setTransactions(prev => [...prev, ...parsedTxns.filter((tx): tx is ParsedTransaction => tx !== null)]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const parseTx = (
    tx: ParsedTransactionWithMeta | null,
    sigInfo: ConfirmedSignatureInfo,
    walletPubkey: PublicKey
  ): ParsedTransaction | null => {
    if (!tx?.meta || !tx.blockTime) return null;

    // Find the relevant transfer instruction
    const transferInstruction = tx.transaction.message.instructions.find(
      (ix: any) => 'program' in ix && 'parsed' in ix && 
      ix.program === 'system' && ix.parsed?.type === 'transfer'
    );

    if (!transferInstruction || !('parsed' in transferInstruction)) return null;

    const { info } = transferInstruction.parsed;
    const amount = info.lamports / LAMPORTS_PER_SOL;
    const isSender = info.source === walletPubkey.toString();

    return {
      signature: sigInfo.signature,
      timestamp: tx.blockTime * 1000, // Convert to milliseconds
      status: tx.meta.err ? 'failed' : 'confirmed',
      amount,
      type: isSender ? 'sent' : 'received',
      otherParty: isSender ? info.destination : info.source
    };
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
    <div className="container mx-auto p-8">
      <h1 className="text-[#39ff14] text-2xl mb-8">Transaction History</h1>

      {error ? (
        <div className="text-red-400 mb-4">{error}</div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.signature}
              className="card cyberpunk p-4 hover:border-[#39ff14]/80"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className={`text-lg ${
                    tx.type === 'received' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'received' ? '+' : '-'}{tx.amount} SOL
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </span>
                </div>
                <span className={`text-sm ${
                  tx.status === 'confirmed' ? 'text-[#39ff14]' : 'text-red-400'
                }`}>
                  {tx.status}
                </span>
              </div>
              
              <div className="text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-400">
                    {tx.type === 'sent' ? 'To' : 'From'}:
                  </span>
                  <span className="font-mono text-[#39ff14] truncate">
                    {tx.otherParty}
                  </span>
                </div>
              </div>
              
              <div className="mt-2">
                <ExplorerLink type="tx" value={tx.signature}>
                View on Explorer →
                </ExplorerLink>
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-center py-4">Loading transactions...</div>
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
            <div className="text-center text-gray-400 py-4">
              No more transactions to load
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="text-center text-gray-400 py-4">
              No transactions found
            </div>
          )}
        </div>
      )}
    </div>
  );
};