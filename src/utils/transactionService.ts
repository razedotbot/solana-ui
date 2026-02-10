import type { ApiResponse, BundleResult } from "./types";

const getBaseUrl = (): string =>
  ((window as unknown as { tradingServerUrl?: string }).tradingServerUrl?.replace(/\/+$/, "") || "");

/**
 * Sends transactions via the trading server's /v2/sol/send endpoint
 * @param transactions - Array of base64-encoded serialized transactions
 * @returns Result from the server
 */
export const sendTransactions = async (
  transactions: string[],
): Promise<BundleResult> => {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/v2/sol/send`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transactions }),
  });

  const result = (await response.json()) as ApiResponse<BundleResult>;

  if (!result.success) {
    const errorMessage = result.error || "Unknown error sending transactions";
    const errorDetails = result.details ? `: ${result.details}` : "";
    throw new Error(`${errorMessage}${errorDetails}`);
  }

  return result.result as BundleResult;
};
