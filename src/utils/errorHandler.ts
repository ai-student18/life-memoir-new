
import { toast } from "sonner";
import { extractErrorMessage } from "./errorHandling";

/**
 * Centralized error handling for async operations
 * @param promise The promise to handle
 * @param options Configuration options
 * @returns A tuple with [data, error]
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  options: {
    errorMessage?: string;
    showToast?: boolean;
    fallbackData?: T;
    onError?: (error: unknown) => void;
  } = {}
): Promise<[T | null, unknown]> {
  const {
    errorMessage = "An error occurred",
    showToast = true,
    fallbackData = null,
    onError,
  } = options;

  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    console.error("Error in safeAsync:", error);
    
    if (onError) {
      onError(error);
    }

    if (showToast) {
      toast.error(errorMessage, {
        description: extractErrorMessage(error),
      });
    }

    return [fallbackData as T, error];
  }
}

/**
 * Wrapper for fetch operations with error handling and type safety
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit,
  errorConfig?: {
    errorMessage?: string;
    showToast?: boolean;
  }
): Promise<[T | null, unknown]> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return [data as T, null];
  } catch (error) {
    if (errorConfig?.showToast !== false) {
      toast.error(errorConfig?.errorMessage || "Failed to fetch data", {
        description: extractErrorMessage(error),
      });
    }
    
    console.error("Fetch error:", error);
    return [null, error];
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const { 
    retries = 3, 
    delay = 500, 
    maxDelay = 5000,
    onRetry 
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (onRetry) {
        onRetry(attempt + 1, err);
      }
      
      if (attempt < retries - 1) {
        const backoffDelay = Math.min(
          delay * Math.pow(2, attempt),
          maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
}
