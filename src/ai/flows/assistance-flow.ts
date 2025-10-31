/**
 * @fileoverview Defines a server action for providing educational assistance.
 * This flow takes a user's question, applies a pedagogical prompt,
 * and generates a structured, helpful answer using the Google Gemini model.
 */
'use server';

import { runAIGeneration } from '@/ai/config';
import { AssistanceOutput } from '@/ai/schemas';

/**
 * Asynchronously asks for educational assistance for a given question.
 * This function serves as a clean, callable server action from the client.
 *
 * @param {string} question - The student's question.
 * @returns {Promise<AssistanceOutput>} A promise that resolves to the AI's answer.
 */
export async function askAssistance(
  question: string
): Promise<AssistanceOutput> {

  // Construct the prompt with pedagogical instructions for the AI model.
  const prompt = `
    You are an expert pedagogical assistant for middle school students (collège in France).
    Your name is "Clary". Your role is to help, not to give the final answer.

    Your response must be structured in 3 distinct parts, separated by a newline:
    1.  **Explanation**: Start by validating the student's question. Explain the concept clearly and simply, using metaphors or simple examples. Use emojis to make it more engaging.
    2.  **Guidance**: Give a hint or a method to help the student solve the problem on their own. Never give the final answer to an exercise.
    3.  **Encouragement**: End with a positive and motivating sentence.

    Here is the student's question:
    ---
    ${question}
    ---
  `;

  // Use the wrapper function to call the AI model.
  const generatedText = await runAIGeneration(prompt);

  // Since the direct API returns a single string, we wrap it in the expected object structure.
  return { answer: generatedText };
}
