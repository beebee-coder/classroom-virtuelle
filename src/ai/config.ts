/**
 * @fileoverview This file initializes and configures the Genkit AI framework.
 * It sets up the necessary plugins, in this case, the Google AI plugin for Gemini,
 * and exports a singleton `ai` object that can be used throughout the application
 * to define and run AI flows.
 */
'use server';

import { genkit, type GenkitErrorCode } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin.
// This makes Google's AI models, like Gemini, available for use in flows.
// The plugin is configured using environment variables (e.g., GOOGLE_GENAI_API_KEY).
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Log errors to the console for easier debugging.
  logErrors: true,
  // Define a custom error handler to manage exceptions gracefully.
  // This prevents the application from crashing on AI-related errors.
  errorHandler: (err: { name: string, message: string, stack?: string, code?: GenkitErrorCode, cause?: Error }) => {
    // Log the full error for debugging purposes on the server.
    console.error('[Genkit Error]', err);

    // Provide a user-friendly error message.
    // Avoid exposing sensitive details from the original error.
    throw new Error('An error occurred with the AI service. Please try again later.');
  },
});
