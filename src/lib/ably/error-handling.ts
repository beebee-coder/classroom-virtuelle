// src/lib/ably/error-handling.ts

import type { ErrorInfo } from 'ably';

/**
 * @fileoverview Centralized error handling utilities for Ably.
 */

/**
 * Checks if an error is a "retriable" network error.
 * Ably's client library handles most retries automatically, but this can
 * be useful for custom UI feedback.
 * 
 * @param error The Ably ErrorInfo object.
 * @returns True if the error is likely a temporary network issue.
 */
export function isRetriableError(error: ErrorInfo): boolean {
    // Ably error codes in the 500-504 range are typically server-side issues.
    // Codes in the 800xx range are connection-related.
    if (error.statusCode >= 500 && error.statusCode <= 504) {
        return true;
    }
    if (error.code >= 80000 && error.code < 90000) {
        return true;
    }
    return false;
}

/**
 * Provides a user-friendly message for common Ably errors.
 * 
 * @param error The Ably ErrorInfo object.
 * @returns A string containing a simplified error message.
 */
export function getFriendlyErrorMessage(error: ErrorInfo | null): string {
    if (!error) {
        return 'An unknown error occurred.';
    }

    switch (error.code) {
        case 40140:
        case 40142:
            return "Authentication failed. Please refresh the page to try again.";
        case 80019:
            return "The connection was disconnected because another client with the same ID connected.";
        case 91000:
            return "Unable to connect, the maximum number of clients are already connected.";
        default:
            if (error.statusCode === 403) {
                return "Access denied. You don't have permission for this action.";
            }
            if (isRetriableError(error)) {
                return "Network connection issue. We are trying to reconnect...";
            }
            return `A connection error occurred (Code: ${error.code}).`;
    }
}
