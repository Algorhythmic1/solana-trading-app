import { JupiterQuote } from '../types';

export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number
): Promise<JupiterQuote> {
  console.log('Requesting quote with params:', {
    inputMint,
    outputMint,
    amount,
    slippage
  });

  const url = new URL('https://quote-api.jup.ag/v6/quote');
  url.searchParams.append('inputMint', inputMint);
  url.searchParams.append('outputMint', outputMint);
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('slippageBps', Math.round(slippage * 100).toString());

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Quote error:', data);
      throw new Error(data.error || 'Failed to get quote');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    throw error;
  }
}