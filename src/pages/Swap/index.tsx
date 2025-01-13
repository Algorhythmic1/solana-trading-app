import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowDownUp } from 'lucide-react';
import { TokenSelector } from '../../components/TokenSelector';
import { getSwapQuote } from '../../utils/getSwapQuote';
import type { JupiterToken, JupiterQuote } from '../../types';
import { Keypair, Connection, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { searchTokensByAny } from '../../utils/getAllTokens';
import { QuoteDetails } from '../../components/QuoteDetails';
import { executeSwap } from '../../utils/executeSwap';
import { TransactionConfirmation } from '../../components/modals/TransactionConfirmation';

interface SwapPageProps {
  wallet: Keypair | null;
  connection: Connection;
}

interface TokenWithBalance extends JupiterToken {
  balance?: string;
  decimals: number;
}

export const SwapPage = ({ wallet, connection }: SwapPageProps) => {
  const [fromToken, setFromToken] = useState<TokenWithBalance | null>(null);
  const [toToken, setToToken] = useState<TokenWithBalance | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenWithBalance[]>([]);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(1);
  const [isCustomSlippage, setIsCustomSlippage] = useState(false);
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transaction, setTransaction] = useState<VersionedTransaction | null>(null);

  const slippagePresets = [0.1, 0.3, 1.0];

  if (!wallet) {
    return <Navigate to="/" replace />;
  }

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setToAmount('');
  };

  const handleSlippageChange = (value: number | string) => {
    const numValue = Number(value);
    if (numValue >= 0 && numValue <= 100) {
      setSlippage(numValue);
    }
  };

  // Fetch quote when inputs change or on interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchQuote = async () => {
      if (!fromToken || !toToken || !fromAmount || Number(fromAmount) <= 0) {
        setToAmount('');
        setQuote(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const quoteResponse = await getSwapQuote(
          fromToken.address,
          toToken.address,
          Number(fromAmount) * Math.pow(10, fromToken.decimals),
          slippage,
        );

        if (quoteResponse) {
          setQuote(quoteResponse);
          const outAmount = quoteResponse.outAmount / Math.pow(10, toToken.decimals);
          setToAmount(outAmount.toFixed(toToken.decimals));
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to fetch quote');
        setToAmount('');
        setQuote(null);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
    intervalId = setInterval(fetchQuote, 10000);

    return () => clearInterval(intervalId);
  }, [fromToken, toToken, fromAmount, slippage]);

  // Fetch wallet token balances
  useEffect(() => {
    const fetchTokenBalances = async () => {
      if (!wallet) return;
      try {
        console.log('Fetching token accounts for:', wallet.publicKey.toString());
        
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed'  // Add commitment level
        );

        console.log('Found token accounts:', tokenAccounts.value.length);

        const tokens = (await Promise.all(tokenAccounts.value.map(async account => {
          try {
            const mintAddress = account.account.data.parsed.info.mint;
            console.log('Processing token:', mintAddress);
            
            const balance = account.account.data.parsed.info.tokenAmount.amount;
            const decimals = account.account.data.parsed.info.tokenAmount.decimals;

            // Get token info with retries
            let tokenInfo = null;
            for (let i = 0; i < 3; i++) {  // Try up to 3 times
              try {
                tokenInfo = (await searchTokensByAny(mintAddress))[0];
                if (tokenInfo) break;
              } catch (err) {
                console.warn(`Attempt ${i + 1} failed for token ${mintAddress}:`, err);
                await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1s between retries
              }
            }
            
            if (!tokenInfo) {
              console.warn(`No token info found for ${mintAddress}`);
              return null;
            }

            return {
              ...tokenInfo,
              balance,
              decimals,
            } as TokenWithBalance;
          } catch (err) {
            console.warn(`Failed to fetch token info for account:`, err);
            return null;
          }
        }))).filter((t): t is TokenWithBalance => t !== null);

        console.log('Successfully processed tokens:', tokens.length);
        setWalletTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch token balances:', error);
        // Don't let token balance failures crash the UI
        setWalletTokens([]);
      }
    };

    fetchTokenBalances();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchTokenBalances, 30000);  // Refresh every 30s
    return () => clearInterval(intervalId);
  }, [wallet, connection]);

  const handleMaxAmount = () => {
    if (fromToken?.balance) {
      setFromAmount((Number(fromToken.balance) / Math.pow(10, fromToken.decimals)).toString());
    }
  };

  const handleReviewSwap = async () => {
    if (!wallet || !quote || !fromToken || !toToken) return;

    try {
      setLoading(true);
      // Get the swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          computeUnitPriceMicroLamports: 1,
          asLegacyTransaction: false,
        }),
      });

      const swapData = await swapResponse.json();
      const swapTransaction = VersionedTransaction.deserialize(
        Buffer.from(swapData.swapTransaction, 'base64')
      );

      setTransaction(swapTransaction);
      setShowConfirmation(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to prepare swap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-dark-bg">
      <h1 className="text-xl text-sol-green mb-4">Swap Tokens</h1>

      <div className="grid grid-cols-[500px,auto] gap-4">
        <div className="card cyberpunk">
          <div className="space-y-3">
            {/* From Token */}
            <div className="space-y-1">
              <label className="text-sol-green text-sm">From</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <TokenSelector
                    value={fromToken || undefined}
                    onSelect={(token) => {
                      const withBalance = walletTokens.find(t => t.address === token.address);
                      setFromToken(withBalance || token);
                    }}
                    placeholder="Select token to swap from..."
                  />
                  {fromToken?.balance && (
                    <div className="text-sm text-[color:var(--sol-green)] mt-1">
                      Balance: {(Number(fromToken.balance) / Math.pow(10, fromToken.decimals)).toFixed(4)}
                    </div>
                  )}
                </div>
                <div className="w-1/3 flex flex-col gap-1">
                  <input
                    type="number"
                    className="cyberpunk-compact text-[color:var(--sol-green)] w-full"
                    placeholder="Amount"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    min="0"
                    step="any"
                  />
                  {fromToken?.balance && (
                    <button
                      onClick={handleMaxAmount}
                      className="cyberpunk text-xs py-0.5"
                    >
                      Max
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center py-1">
              <button
                onClick={handleSwapTokens}
                className="cyberpunk modal-btn p-1.5"
                disabled={!fromToken || !toToken}
              >
                <ArrowDownUp className="w-4 h-4" />
              </button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <label className="text-sol-green">To</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <TokenSelector
                    value={toToken || undefined}
                    onSelect={setToToken}
                    placeholder="Select token to swap to..."
                  />
                </div>
                <div className="w-1/3">
                  <input
                    type="number"
                    className="cyberpunk-compact text-[color:var(--sol-green)] w-full"
                    placeholder="Amount"
                    value={toAmount}
                    disabled
                    min="0"
                    step="any"
                  />
                </div>
              </div>
            </div>

            {/* Slippage Settings */}
            <div className="space-y-2">
              <label className="text-sol-green text-sm">Slippage Tolerance</label>
              <div className="flex items-center gap-2">
                {slippagePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setSlippage(preset);
                      setIsCustomSlippage(false);
                    }}
                    className={`cyberpunk modal-btn px-3 py-1 text-sm ${
                      slippage === preset && !isCustomSlippage
                        ? 'border-sol-green'
                        : 'border-sol-border'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
                <div className="relative flex items-center">
                  <input
                    type="number"
                    className={`cyberpunk w-20 text-sm px-3 py-1 ${
                      isCustomSlippage ? 'border-sol-green' : 'border-sol-border'
                    }`}
                    placeholder="Custom"
                    value={isCustomSlippage ? slippage : ''}
                    onChange={(e) => {
                      setIsCustomSlippage(true);
                      handleSlippageChange(e.target.value);
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="absolute right-3 text-sol-text">%</span>
                </div>
              </div>
              {slippage > 5 && (
                <p className="text-sol-error text-sm">
                  High slippage tolerance. Your transaction may be frontrun.
                </p>
              )}
            </div>

            {error && (
              <div className="text-sol-error text-sm text-center">
                {error}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="mt-8">
            <button
              className="cyberpunk w-full"
              disabled={Boolean(
                !fromToken || 
                !toToken || 
                !fromAmount || 
                loading || 
                isSwapping ||
                (fromToken?.balance && Number(fromAmount) > Number(fromToken.balance) / Math.pow(10, fromToken.decimals))
              )}
              onClick={handleReviewSwap}
            >
              {isSwapping ? 'Executing Swap...' : loading ? 'Preparing Swap...' : 'Review Swap'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {quote && fromToken && toToken && (
            <div className="card cyberpunk">
              <QuoteDetails 
                quote={quote}
                fromSymbol={fromToken.symbol}
                toSymbol={toToken.symbol}
              />
            </div>
          )}

          {showConfirmation && transaction && fromToken && toToken && (
            <TransactionConfirmation
              transaction={transaction}
              onClose={() => {
                setShowConfirmation(false);
                setTransaction(null);
              }}
              onConfirm={async () => {
                try {
                  setIsSwapping(true);
                  const result = await executeSwap(transaction, connection);
                  
                  if (result.success) {
                    console.log('Swap executed:', result.txid);
                    setShowConfirmation(false);
                    setTransaction(null);
                    setFromAmount('');
                    setToAmount('');
                    setQuote(null);
                  } else {
                    setError(result.error || 'Failed to execute swap');
                  }
                } catch (error) {
                  setError(error instanceof Error ? error.message : 'Failed to execute swap');
                } finally {
                  setIsSwapping(false);
                }
              }}
              expectedChanges={{
                sol: 0,
                tokens: [
                  {
                    mint: fromToken.address,
                    symbol: fromToken.symbol,
                    amount: -Number(fromAmount),
                    decimals: fromToken.decimals
                  },
                  {
                    mint: toToken.address,
                    symbol: toToken.symbol,
                    amount: Number(toAmount),
                    decimals: toToken.decimals
                  }
                ]
              }}
              connection={connection}
            />
          )}
        </div>
      </div>
    </div>
  );
};