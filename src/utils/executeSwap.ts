import { Connection, VersionedTransaction, SendTransactionError, Keypair } from '@solana/web3.js';

interface SwapResult {
  txid: string;
  success: boolean;
  error?: string;
}

export async function executeSwap(
  transaction: VersionedTransaction,
  connection: Connection,
  wallet: Keypair
): Promise<SwapResult> {
  try {

    transaction.sign([wallet]);

    // Verify transaction is properly signed
    if (!transaction.signatures[0] || transaction.signatures[0].every(byte => byte === 0)) {
      throw new Error('Transaction not properly signed');
    }

    //apply latest blockhash to transaction
    console.log('transaction blockhash', transaction.message.recentBlockhash);

    console.log('transaction', transaction);
    const rawTransaction = transaction.serialize()

    const txid = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
      maxRetries: 2
    });

    console.log('executeSwap - Transaction sent with ID:', txid);

    const latestBlockhash = await connection.getLatestBlockhash();

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