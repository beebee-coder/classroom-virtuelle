/**
 * @fileoverview Defines a Genkit flow for providing educational assistance.
 * This flow takes a user's question, applies a pedagogical prompt,
 * and generates a structured, helpful answer using an AI model.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the input of the assistance flow.
// This ensures that any input to the flow is a simple string.
export const AssistanceInputSchema = z.string();

// Define the schema for the output of the assistance flow.
// The AI model will be instructed to format its response to match this structure.
export const AssistanceOutputSchema = z.object({
  answer: z.string().describe('The clear, pedagogical, and encouraging answer to the student\'s question.'),
});

// This is the main flow definition.
// It's an async function that encapsulates the logic for our AI assistant.
const assistanceFlow = ai.defineFlow(
  {
    name: 'assistanceFlow',
    inputSchema: AssistanceInputSchema,
    outputSchema: AssistanceOutputSchema,
  },
  async (question) => {
    // Define the prompt that will be sent to the AI model.
    // It includes instructions on how to behave (the "system" prompt) and the user's question.
    const llmResponse = await ai.generate({
      prompt: `
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
      `,
      model: 'gemini-1.5-flash-latest', // Use a powerful and fast model.
      output: {
        schema: AssistanceOutputSchema, // Ensure the output conforms to our defined schema.
      },
      config: {
        temperature: 0.5, // A lower temperature for more focused and less random responses.
      },
    });

    // Return the structured output from the AI model.
    return llmResponse.output!;
  }
);

/**
 * Asynchronously asks for educational assistance for a given question.
 * This function serves as a clean, callable wrapper around the Genkit flow.
 *
 * @param {string} question - The student's question.
 * @returns {Promise<{ answer: string }>} A promise that resolves to the AI's structured answer.
 */
export async function askAssistance(
  question: string
): Promise<{ answer: string }> {
  // Execute the flow with the provided question.
  const response = await assistanceFlow(question);
  return response;
}
