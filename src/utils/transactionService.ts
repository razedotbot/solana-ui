import type { ApiResponse, BundleResult } from "./types";
import { loadConfigFromCookies } from "./storage";

interface WindowWithConfig {
  tradingServerUrl?: string;
}

interface SendingConfig {
  sendingMode: string;
  customRpcEndpoint: string;
  customJitoSingleEndpoint: string;
  customJitoBundleEndpoint: string;
  singleTxMode: string;
  multiTxMode: string;
}

/**
 * Get the base URL for the trading server
 */
const getBaseUrl = (): string => {
  return (
    (window as unknown as WindowWithConfig).tradingServerUrl?.replace(
      /\/+$/,
      "",
    ) || ""
  );
};

/**
 * Get sending configuration from cookies with defaults
 */
const getSendingConfig = (): SendingConfig => {
  const config = loadConfigFromCookies();
  return {
    sendingMode: config?.sendingMode || "server",
    customRpcEndpoint: config?.customRpcEndpoint || "",
    customJitoSingleEndpoint: config?.customJitoSingleEndpoint || "",
    customJitoBundleEndpoint: config?.customJitoBundleEndpoint || "",
    singleTxMode: config?.singleTxMode || "rpc",
    multiTxMode: config?.multiTxMode || "bundle",
  };
};

/**
 * Create a BundleResult object
 */
const createBundleResult = (result?: string): BundleResult => ({
  jsonrpc: "2.0",
  id: 1,
  result,
});

/**
 * Send transactions via the trading server's /v2/sol/send endpoint
 */
const sendViaServer = async (transactions: string[]): Promise<BundleResult> => {
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

/**
 * Send a single transaction via RPC sendTransaction
 */
const sendViaRpc = async (
  transaction: string,
  rpcEndpoint: string,
): Promise<string> => {
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [
        transaction,
        {
          encoding: "base64",
          skipPreflight: true,
          preflightCommitment: "confirmed",
        },
      ],
    }),
  });

  const result = (await response.json()) as {
    result?: string;
    error?: { message: string };
  };

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.result || "";
};

/**
 * Send a single transaction via Jito /api/v1/transactions endpoint
 * Uses sendTransaction method for single tx with tip
 */
const sendViaJitoSingle = async (
  transaction: string,
  jitoEndpoint: string,
): Promise<BundleResult> => {
  const response = await fetch(jitoEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendTransaction",
      params: [
        transaction,
        {
          encoding: "base64",
        },
      ],
    }),
  });

  const result = (await response.json()) as BundleResult;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
};

/**
 * Send transactions as a Jito bundle via /api/v1/bundles endpoint
 * Uses sendBundle method for atomic bundles
 */
const sendViaJitoBundle = async (
  transactions: string[],
  jitoEndpoint: string,
): Promise<BundleResult> => {
  const response = await fetch(jitoEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [
        transactions,
        {
          encoding: "base64",
        },
      ],
    }),
  });

  const result = (await response.json()) as BundleResult;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
};

/**
 * Send multiple transactions via RPC in parallel
 */
const sendViaRpcParallel = async (
  transactions: string[],
  rpcEndpoint: string,
): Promise<BundleResult> => {
  const results = await Promise.all(
    transactions.map((tx) => sendViaRpc(tx, rpcEndpoint)),
  );

  // Return the last signature as the result
  return createBundleResult(results[results.length - 1]);
};

/**
 * Send multiple transactions via RPC sequentially
 */
const sendViaRpcSequential = async (
  transactions: string[],
  rpcEndpoint: string,
): Promise<BundleResult> => {
  let lastSignature = "";

  for (const tx of transactions) {
    lastSignature = await sendViaRpc(tx, rpcEndpoint);
  }

  return createBundleResult(lastSignature);
};

/**
 * Sends transactions using configured routing
 * @param transactions - Array of base64-encoded serialized transactions
 * @returns Result from the server/endpoint
 */
export const sendTransactions = async (
  transactions: string[],
): Promise<BundleResult> => {
  const config = getSendingConfig();

  // If using server mode, send via trading server
  if (config.sendingMode === "server") {
    return await sendViaServer(transactions);
  }

  // Custom mode - route based on configuration
  const isSingleTx = transactions.length === 1;

  if (isSingleTx) {
    // Single transaction routing
    if (config.singleTxMode === "jito" && config.customJitoSingleEndpoint) {
      return await sendViaJitoSingle(
        transactions[0],
        config.customJitoSingleEndpoint,
      );
    } else if (config.customRpcEndpoint) {
      const signature = await sendViaRpc(
        transactions[0],
        config.customRpcEndpoint,
      );
      return createBundleResult(signature);
    } else {
      // Fallback to server if no custom endpoint configured
      return await sendViaServer(transactions);
    }
  } else {
    // Multiple transactions routing
    switch (config.multiTxMode) {
      case "bundle":
        if (config.customJitoBundleEndpoint) {
          return await sendViaJitoBundle(
            transactions,
            config.customJitoBundleEndpoint,
          );
        }
        // Fallback to server if no Jito endpoint
        return await sendViaServer(transactions);

      case "parallel":
        if (config.customRpcEndpoint) {
          return await sendViaRpcParallel(
            transactions,
            config.customRpcEndpoint,
          );
        }
        // Fallback to server if no RPC endpoint
        return await sendViaServer(transactions);

      case "sequential":
        if (config.customRpcEndpoint) {
          return await sendViaRpcSequential(
            transactions,
            config.customRpcEndpoint,
          );
        }
        // Fallback to server if no RPC endpoint
        return await sendViaServer(transactions);

      default:
        // Default to server
        return await sendViaServer(transactions);
    }
  }
};
