/**
 * Shared Transaction Response Parsing
 *
 * Extracts transaction bundles from various backend response formats.
 * Both buy and sell endpoints return data in multiple possible shapes;
 * this module normalises them into a consistent array of bundles.
 */

// ============================================================================
// Types
// ============================================================================

/** Minimal bundle shape returned by the parser */
export interface TransactionBundleData {
  transactions: string[];
}

/**
 * The loosely-typed response envelope that the backend may return.
 * Covers every variant observed across buy / sell endpoints.
 */
export interface RawTransactionResponse {
  success?: boolean;
  error?: string;
  data?: {
    bundles?: unknown[];
    transactions?: string[];
    [key: string]: unknown;
  };
  bundles?: unknown[];
  transactions?: string[];
  [key: string]: unknown;
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse a backend response into a normalised array of transaction bundles.
 *
 * Resolution order (first match wins):
 *  1. `data.data.bundles`  (array of bundles or string arrays)
 *  2. `data.data.transactions` (flat transaction list  -> single bundle)
 *  3. `data.bundles`       (top-level bundles)
 *  4. `data.transactions`  (top-level flat list -> single bundle)
 *  5. `data` itself is an array  -> single bundle
 *
 * Throws if none of the above patterns match.
 */
export const parseTransactionBundles = (
  data: RawTransactionResponse,
): TransactionBundleData[] => {
  // 1. data.data.bundles
  if (data.data && typeof data.data === "object" && data.data !== null) {
    const responseData = data.data as {
      bundles?: unknown[];
      transactions?: string[];
    };

    if ("bundles" in responseData && Array.isArray(responseData.bundles)) {
      return responseData.bundles.map((bundle: unknown) =>
        Array.isArray(bundle)
          ? { transactions: bundle as string[] }
          : (bundle as TransactionBundleData),
      );
    }

    // 2. data.data.transactions
    if (
      "transactions" in responseData &&
      Array.isArray(responseData.transactions)
    ) {
      return [{ transactions: responseData.transactions }];
    }
  }

  // 3. Top-level bundles
  if ("bundles" in data && Array.isArray(data.bundles)) {
    return data.bundles.map((bundle: unknown) =>
      Array.isArray(bundle)
        ? { transactions: bundle as string[] }
        : (bundle as TransactionBundleData),
    );
  }

  // 4. Top-level transactions
  if ("transactions" in data && Array.isArray(data.transactions)) {
    return [{ transactions: data.transactions }];
  }

  // 5. Raw array
  if (Array.isArray(data)) {
    return [{ transactions: data as unknown as string[] }];
  }

  throw new Error("No transactions returned from backend");
};
