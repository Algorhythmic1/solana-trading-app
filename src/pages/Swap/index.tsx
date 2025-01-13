import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowDownUp } from 'lucide-react';
import { TokenSelector } from '../../components/TokenSelector';
import { getSwapQuote } from '../../utils/getSwapQuote';
import type { JupiterToken } from '../../types';
import { Keypair, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { searchTokensByAny } from '../../utils/getAllTokens';

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

  const slippagePresets = [0.1, 0.5, 1.0, 2.0];

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
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const quote = await getSwapQuote(
          fromToken.address,
          toToken.address,
          Number(fromAmount) * Math.pow(10, fromToken.decimals),
          slippage,
        );

        if (quote) {
          const outAmount = quote.outAmount / Math.pow(10, toToken.decimals);
          setToAmount(outAmount.toFixed(toToken.decimals));
        }
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to fetch quote');
        setToAmount('');
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
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          wallet.publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        const tokens = (await Promise.all(tokenAccounts.value.map(async account => {
          const mintAddress = account.account.data.parsed.info.mint;
          const balance = account.account.data.parsed.info.tokenAmount.amount;
          const decimals = account.account.data.parsed.info.tokenAmount.decimals;

          const tokenInfo = (await searchTokensByAny(mintAddress))[0];
          
          if (!tokenInfo) return null;

          return {
            ...tokenInfo,
            balance,
            decimals,
          } as TokenWithBalance;
        }))).filter((t): t is TokenWithBalance => t !== null);

        setWalletTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch token balances:', error);
      }
    };

    fetchTokenBalances();
  }, [wallet, connection]);

  const handleMaxAmount = () => {
    if (fromToken?.balance) {
      setFromAmount((Number(fromToken.balance) / Math.pow(10, fromToken.decimals)).toString());
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl text-sol-green mb-8">Swap Tokens</h1>

      <div className="card cyberpunk max-w-2xl mx-auto">
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-sol-green">From</label>
            <div className="flex gap-4">
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
                  <div className="text-sm text-sol-text mt-1">
                    Balance: {(Number(fromToken.balance) / Math.pow(10, fromToken.decimals)).toFixed(4)}
                  </div>
                )}
              </div>
              <div className="w-1/3 flex flex-col">
                <input
                  type="number"
                  className="cyberpunk w-full"
                  placeholder="Amount"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  min="0"
                  step="any"
                />
                {fromToken?.balance && (
                  <button
                    onClick={handleMaxAmount}
                    className="cyberpunk text-xs mt-1"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="cyberpunk modal-btn p-2"
              disabled={!fromToken || !toToken}
            >
              <ArrowDownUp className="w-6 h-6" />
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
                  className="cyberpunk w-full"
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
              (fromToken.balance && Number(fromAmount) > Number(fromToken.balance) / Math.pow(10, fromToken.decimals))
            )}
          >
            {loading ? 'Fetching Quote...' : 'Review Swap'}
          </button>
        </div>
      </div>
    </div>
  );
};