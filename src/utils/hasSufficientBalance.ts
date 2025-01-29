import { TokenWithBalance } from "@/types";

export interface BalanceCheck {
  token: TokenWithBalance;
  amount: string;
  nativeSolBalance: number | null;
  estimatedFee?: number;
}

export function hasEnoughBalance({
  token, 
  amount, 
  nativeSolBalance
}: BalanceCheck): boolean {
  if (!token || !amount || Number(amount) <= 0) return false;
  
  if (token.address === 'native') {
    return nativeSolBalance !== null && 
           nativeSolBalance > 0 && 
           Number(amount) <= nativeSolBalance;
  }
  
  return Number(token.balance) > 0 && 
         Number(amount) <= (Number(token.balance) / Math.pow(10, token.decimals));
}