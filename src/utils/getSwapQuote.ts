import { JupiterQuote } from '../types';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number
): Promise<JupiterQuote> {

  // Convert native to WSOL mint
  const actualInputMint = inputMint === 'native' ? WSOL_MINT : inputMint;
  const actualOutputMint = outputMint === 'native' ? WSOL_MINT : outputMint;

  console.log('Requesting quote with params:', {
    inputMint,
    outputMint,
    amount,
    slippage
  });

  const url = new URL('https://api.jup.ag/swap/v1/quote');
  url.searchParams.append('inputMint', actualInputMint);
  url.searchParams.append('outputMint', actualOutputMint);
  url.searchParams.append('amount', amount.toString());
  url.searchParams.append('slippageBps', Math.round(slippage * 100).toString());
  url.searchParams.append('restrictIntermediateTokens', 'true');

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

