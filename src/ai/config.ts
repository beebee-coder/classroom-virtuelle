/**
 * @fileoverview This file initializes and configures the Google Generative AI client.
 * It sets up the generative model and exports a singleton instance that can be
 * used throughout the application to interact with the Gemini API.
 */
'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

// Get the API key from environment variables.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment variables.');
}

// Initialize the main AI client.
const genAI = new GoogleGenerativeAI(apiKey);

// Define and export the specific model to be used.
// This makes it easy to swap out models in the future.
export const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
});

// A simple wrapper for handling potential errors during API calls.
export async function runAIGeneration(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('[AI Generation Error]', error);
    throw new Error('An error occurred with the AI service. Please try again later.');
  }
}
