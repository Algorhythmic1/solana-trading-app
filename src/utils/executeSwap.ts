import { Connection, VersionedTransaction } from '@solana/web3.js';

interface SwapResult {
  txid: string;
  success: boolean;
  error?: string;
}

export async function executeSwap(
  transaction: VersionedTransaction,
  connection: Connection
): Promise<SwapResult> {
  try {
    const txid = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });
    
    // Use newer confirmation API
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    if (confirmation.value.err) {
      throw new Error('Transaction failed');
    }

    return {
      txid,
      success: true
    };
  } catch (error) {
    console.error('Failed to execute swap:', error);
    return {
      txid: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute swap'
    };
  }
} 