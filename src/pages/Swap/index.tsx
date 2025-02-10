import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowDownUp } from 'lucide-react';
import { TokenSelector } from '../../components/TokenSelector';
import { getSwapQuote } from '../../utils/getSwapQuote';
import type { TokenWithBalance, JupiterQuote } from '../../types';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { QuoteDetails } from '../../components/modals/QuoteDetails';
import { executeSwap } from '../../utils/executeSwap';
import { fetchTokenBalances } from '../../utils/fetchTokenBalances';
import { useOutletContext } from 'react-router-dom';
import type { ContextType } from '../../types';
import { TransactionResult } from '../../types';
import { TransactionResultModal } from '../../components/modals/TransactionResult';

export const SwapPage = () => {
  const { wallet, selectedNetwork } = useOutletContext<ContextType>();
  const [fromToken, setFromToken] = useState<TokenWithBalance | null>(null);
  const [toToken, setToToken] = useState<TokenWithBalance | null>(null);
  const [walletTokens, setWalletTokens] = useState<TokenWithBalance[]>([]);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'fetching_quote' | 'fetching_balances' | 'preparing_swap' | 'swapping' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(1);
  const [isCustomSlippage, setIsCustomSlippage] = useState(false);
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

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

  const renderModalContent = () => {
    if (!showConfirmation) return null;

    if (transactionResult) {
      return (
        <TransactionResultModal
          signature={transactionResult.signature}
          success={transactionResult.success}
          error={transactionResult.error}
          onClose={() => {
            setShowConfirmation(false);
            setTransactionResult(null);
          }}
          network={selectedNetwork.name}
        />
      );
    }

    if (status === 'swapping') {
      return (
        <div className="card cyberpunk w-full max-w-[480px] min-h-[480px] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="loading-spinner"></div>
            <p className="text-sol-text">Processing Swap...</p>
          </div>
        </div>
      );
    }

    if (!fromToken || !toToken || !quote) return null;

    return (
      <div className="card cyberpunk w-full max-w-[480px]">
        <h2 className="cyberpunk text-xl mb-4">Review Swap</h2>
        <QuoteDetails 
          quote={quote}
          fromSymbol={fromToken.symbol}
          toSymbol={toToken.symbol}
        />
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setShowConfirmation(false)}
            className="cyberpunk modal-btn flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSwap}
            className="cyberpunk modal-btn flex-1"
            style={{ '--button-text-color': 'var(--sol-green)' } as React.CSSProperties}
          >
            Confirm Swap
          </button>
        </div>
      </div>
    );
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
        setStatus('fetching_quote');
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
        setStatus('idle');
      }
    };

    fetchQuote();
    intervalId = setInterval(fetchQuote, 20000);

    return () => clearInterval(intervalId);
  }, [fromToken, toToken, fromAmount, slippage]);

  // Fetch wallet token balances
  useEffect(() => {
    const handleFetchTokens = async () => {
      if (!wallet) return;
      
      try {
        setStatus('fetching_balances');
        const tokens = await fetchTokenBalances({
          wallet,
          selectedNetwork
        });
        setWalletTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch token balances:', error);
        setWalletTokens([]);
      } finally {
        setStatus('idle');
      }
    };

    handleFetchTokens();
    const intervalId = setInterval(handleFetchTokens, 30000);
    return () => clearInterval(intervalId);
  }, [wallet, selectedNetwork]);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet) return;
      try {
        await fetchTokenBalances({
          wallet,
          selectedNetwork
        });
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      }
    };
    fetchBalances();
  }, [wallet, selectedNetwork]);

  const handleMaxAmount = () => {
    if (fromToken?.balance) {
      setFromAmount((Number(fromToken.balance) / Math.pow(10, fromToken.decimals)).toString());
    }
  };

  const handleReviewSwap = async () => {
    if (!wallet || !quote || !fromToken || !toToken) return;
    setShowConfirmation(true);
  };


  const handleConfirmSwap = async () => {
    if (!wallet || !quote || !fromToken || !toToken) return;
    setStatus('swapping');

    try {

      // Get the swap transaction
      const swapResponse = await fetch('https://api.jup.ag/swap/v1/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: wallet.publicKey.toString(),
            dynamicComputeUnitLimit: true,
            dynamicSlippage: true,
            prioritizationFeeLamports: {
              priorityLevelWithMaxLamports: {
                maxLamports: 100_000,
                priorityLevel: "medium"
              }
            }
          })
        }
      );

      if (!swapResponse.ok) {
        const errorData = await swapResponse.json();
        console.error('handleReviewSwap - Swap API error:', errorData);
        throw new Error(errorData.error || 'Failed to prepare swap');
      }

      const transactionBase64 = await swapResponse.json();
      console.log('handleReviewSwap - Built swap transaction:', transactionBase64);
      const swapTransaction = VersionedTransaction.deserialize(
        Buffer.from(transactionBase64.swapTransaction, 'base64')
      );

    const connection = new Connection(selectedNetwork.endpoint, 'confirmed');
    
    try {
      const result = await executeSwap(swapTransaction, connection, wallet);
      setTransactionResult({
        signature: result.txid,
        success: result.success,
        error: result.error,
        network: selectedNetwork.name
      });
      if (result.success) {
        setFromAmount('');
        setToAmount('');
      }
    } catch (error) {
      setTransactionResult({
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute swap',
        network: selectedNetwork.name
      });
    } finally {
      setStatus('complete');
    }
  } catch (error) {
    console.error('Failed to prepare swap:', error);
    setTransactionResult({
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Failed to prepare swap',
      network: selectedNetwork.name
    });
    setStatus('complete');
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
                    onSelect={(selectedToken) => {
                      const withBalance = walletTokens.find(t => t.address === selectedToken.address);
                      if (withBalance) {
                        setFromToken(withBalance);
                      } else {
                        setFromToken({
                          ...selectedToken,
                          balance: '0',
                        });
                      }
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
                    onSelect={(selectedToken) => {
                      const withBalance = walletTokens.find(t => t.address === selectedToken.address);
                      if (withBalance) {
                        setToToken(withBalance);
                      } else {
                        setToToken({
                          ...selectedToken,
                          balance: '0',
                        });
                      }
                    }}
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
                status !== 'idle' ||
                (fromToken?.balance && Number(fromAmount) > Number(fromToken.balance) / Math.pow(10, fromToken.decimals))
              )}
              onClick={handleReviewSwap}
            >
              {status === 'fetching_quote' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-5 h-5" />
                  <span>Fetching Quote...</span>
                </div>
              ) : status === 'fetching_balances' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-5 h-5" />
                  <span>Updating Balances...</span>
                </div>
              ) : status === 'preparing_swap' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-5 h-5" />
                  <span>Preparing Swap...</span>
                </div>
              ) : status === 'swapping' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="spinner w-5 h-5" />
                  <span>Swapping...</span>
                </div>
              ) : (
                'Review Swap'
              )}
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

          {/* Confirmation and Result Modals */}
          
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="absolute inset-0 bg-black/80" />
              <div className="relative z-10">
                {renderModalContent()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};