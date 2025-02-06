import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";

import { VersionedTransaction } from "@solana/web3.js";

type priorityLevel = "Min" | "Low" | "Medium" | "High" | "VeryHigh" | "UnsafeMax";

export async function getPriorityFeeEstimate(
  priorityLevel: priorityLevel, 
  transaction: VersionedTransaction,
  rpcUrl: string
) {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "getPriorityFeeEstimate",
        params: [
          {
            transaction: bs58.encode(transaction.serialize()),
            options: { priorityLevel: priorityLevel },
          },
        ],
      }),
    });
    
    const data = await response.json();
    console.log("Full API response:", data);

    if (data.error) {
      console.error("Priority fee API error:", data.error);
      // Return a default fee estimate if API fails
      return { priorityFeeEstimate: 10000 };
    }

    if (!data.result?.priorityFeeEstimate) {
      console.error("Unexpected API response format:", data);
      // Return a default fee estimate if response format is unexpected
      return { priorityFeeEstimate: 10000 };
    }

    return data.result;
  } catch (error) {
    console.error("Error getting priority fee estimate:", error);
    // Return a default fee estimate if request fails
    return { priorityFeeEstimate: 10000 };
  }
}