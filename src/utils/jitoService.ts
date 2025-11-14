import type { ApiResponse } from '../types/api';

interface WindowWithConfig {
  tradingServerUrl?: string;
}

/**
 * Sends a signed transaction to the server's /solana/send endpoint
 * which then forwards it to the Jito bundle service
 * @param serializedTransaction - bs58-encoded serialized transaction
 * @returns Result from the bundle service
 */
export const sendToJitoBundleService = async (serializedTransaction: string): Promise<unknown> => {
    try {
      // Get the server base URL
      const baseUrl = (window as unknown as WindowWithConfig).tradingServerUrl?.replace(/\/+$/, '') || "";
      const sendBundleEndpoint = `${baseUrl}/solana/send`;
      
      // Create the request payload - this matches what the server endpoint expects
      const payload = {
        transactions: [serializedTransaction] // Server expects an array of transactions
      };
      
      // Send request to our server endpoint (not directly to Jito)
      const response = await fetch(sendBundleEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const result: ApiResponse<unknown> = await response.json() as ApiResponse<unknown>;
      
      if (!result.success) {
        // Handle error from our server endpoint
        const errorMessage = result.error || 'Unknown error sending bundle';
        const errorDetails = result.details ? `: ${result.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }
      
      return result.result;
    } catch (error) {
      console.error('Error sending transaction bundle:', error);
      throw error;
    }
  };