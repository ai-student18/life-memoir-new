
import { toast } from "sonner";

// Error types
export type ErrorWithMessage = {
  message: string;
};

export type ErrorWithCode = ErrorWithMessage & {
  code?: string | number;
};

// Check if the error has a message
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Extract error message from different error types
export function extractErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'אירעה שגיאה לא צפויה';
}

// Handle API errors
export function handleApiError(error: unknown): string {
  const message = extractErrorMessage(error);
  console.error("API Error:", error);
  return message;
}

// Display error toast with standardized format
export function showErrorToast(error: unknown, title = 'שגיאה') {
  const message = extractErrorMessage(error);
  toast.error(title, {
    description: message,
  });
}

// Display success toast with standardized format
export function showSuccessToast(message: string, title = 'הצלחה') {
  toast.success(title, {
    description: message,
  });
}
