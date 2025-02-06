import { Connection, VersionedTransaction, SendTransactionError } from '@solana/web3.js';

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
    console.log('executeSwap - Transaction before signing:', {
      signatures: transaction.signatures,
      numSignatures: transaction.signatures.length,
      requiresSignatures: transaction.message.header.numRequiredSignatures
    });

    const txid = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    });

    console.log('executeSwap - Transaction sent with ID:', txid);
    
    // Use newer confirmation API
    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    console.log('executeSwap - Using blockhash:', latestBlockhash);

    const confirmation = await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    if (confirmation.value.err) {
      console.error('executeSwap - Confirmation error:', confirmation.value.err);
      throw new Error('Transaction failed');
    }

    return {
      txid,
      success: true
    };
  } catch (error) {
    console.error('executeSwap - Detailed error:', error);

    // Get simulation logs if available
    if (error instanceof SendTransactionError) {
      try {
        const signature = error.toString().match(/signature (\w+)/)?.[1];
        if (signature) {
          const logs = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0
          });
          console.error('executeSwap - Transaction logs:', logs);
        }
      } catch (logError) {
        console.error('executeSwap - Failed to get logs:', logError);
      }
    }

    return {
      txid: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute swap'
    };
  }
} 