
export const getSwapQuote = async (inputMint: string, outputMint: string, amount: number, slippageBps: number) => {
  
  const quoteResponse = await (
    await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}\
      &outputMint=${outputMint}\
      &amount=${amount}\
      &slippageBps=${slippageBps}`)
    ).json();

  return quoteResponse;
};