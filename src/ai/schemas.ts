/**
 * @fileoverview Defines the shared schemas and types for the AI assistance feature.
 * This file contains Zod schemas for input/output validation and their corresponding TypeScript types.
 */
import { z } from 'zod';

// Define the schema for the input.
export const AssistanceInputSchema = z.string();
export type AssistanceInput = z.infer<typeof AssistanceInputSchema>;

// Define the schema for the output for structured responses.
export const AssistanceOutputSchema = z.object({
  answer: z.string().describe("The clear, pedagogical, and encouraging answer to the student's question."),
});
export type AssistanceOutput = z.infer<typeof AssistanceOutputSchema>;
