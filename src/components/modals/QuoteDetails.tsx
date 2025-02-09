import { JupiterQuote } from '../../types';

interface QuoteDetailsProps {
  quote: JupiterQuote;
  fromSymbol: string;
  toSymbol: string;
}

export const QuoteDetails = ({ quote, fromSymbol, toSymbol }: QuoteDetailsProps) => {
  const priceImpact = typeof quote.priceImpactPct === 'number' 
    ? quote.priceImpactPct.toFixed(2)
    : '0.00';

  const totalFees = quote.routePlan.reduce((acc, step) => acc + step.swapInfo.feeAmount, 0);
  console.log('totalFees', totalFees);
  console.log('totalFees / 10 ** 9', totalFees / 10 ** 9);
  const rate = (quote.outAmount / quote.inAmount).toFixed(6);

  return (
    <div className="card cyberpunk bg-[var(--sol-background)/75] border-sol-green">
      <div className="space-y-2">
        <h3 className="text-sol-green text-sm mb-3">Swap Details</h3>
        
        <div className="flex justify-between">
          <span className="text-sol-text2">Rate</span>
          <span className="text-sol-green">
            1 {fromSymbol} ≈ {rate} {toSymbol}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sol-text2">Price Impact</span>
          <span className={`${Number(priceImpact) > 5 ? 'text-sol-error' : 'text-sol-green'}`}>
            {priceImpact}%
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-sol-text2">Network Fees</span>
          <span className="text-sol-green">{totalFees / 10 ** 9} SOL</span>
        </div>

        <div className="flex justify-between">
          <span className="text-sol-text2">Route</span>
          <span className="text-sol-green text-sm text-right px-2">
            {quote.routePlan.map(step => step.swapInfo.label).join(' → ')}
          </span>
        </div>
      </div>
    </div>
  );
}; 