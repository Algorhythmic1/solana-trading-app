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
  nativeSolBalance,
  estimatedFee = 0
}: BalanceCheck): boolean {
  if (!token || !amount || Number(amount) <= 0) return false;
  
  if (token.address === 'native') {
    return nativeSolBalance !== null && 
           nativeSolBalance > 0 && 
           (Number(amount) + estimatedFee) <= nativeSolBalance;
  }
  
  // For token transfers, we still need enough SOL to pay the network fee
  if (estimatedFee > 0 && (nativeSolBalance === null || nativeSolBalance < estimatedFee)) {
    return false;
  }
  
  return Number(token.balance) > 0 && 
         Number(amount) <= (Number(token.balance) / Math.pow(10, token.decimals));
}