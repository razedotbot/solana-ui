import type { ApiResponse, SenderResult } from "./types";
import { API_ENDPOINTS } from "./constants";

// Intentional inline getBaseUrl — cannot import from trading.ts due to circular dependency
// (transactionService.ts is imported by trading.ts, so importing back would create a cycle)
const getBaseUrl = (): string =>
  ((window as unknown as { tradingServerUrl?: string }).tradingServerUrl?.replace(/\/+$/, "") || "");

/**
 * Sends transactions via the trading server's /v2/sol/send endpoint
 * @param transactions - Array of base64-encoded serialized transactions
 * @returns Result from the server
 */
export const sendTransactions = async (
  transactions: string[],
): Promise<SenderResult> => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}${API_ENDPOINTS.SOL_SEND}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactions }),
  });

  const result = (await response.json()) as ApiResponse<SenderResult>;

  if (!result.success) {
    const errorMessage = result.error || "Unknown error sending transactions";
    const errorDetails = result.details ? `: ${result.details}` : "";
    throw new Error(`${errorMessage}${errorDetails}`);
  }

  return result.result as SenderResult;
};
