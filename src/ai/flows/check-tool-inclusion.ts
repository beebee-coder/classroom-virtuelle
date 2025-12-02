'use server';

/**
 * @fileOverview A flow to check if specific tools or data references have been integrated during development.
 *
 * - checkToolInclusion - A function that checks if specified tools are included.
 * - CheckToolInclusionInput - The input type for the checkToolInclusion function.
 * - CheckToolInclusionOutput - The return type for the checkToolInclusion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CheckToolInclusionInputSchema = z.object({
  codebaseContent: z
    .string()
    .describe('The content of the codebase to be checked.'),
  documentationContent: z
    .string()
    .describe('The content of the documentation that describes the tools.'),
  toolNames: z
    .array(z.string())
    .describe('An array of tool names to check for inclusion.'),
});
export type CheckToolInclusionInput = z.infer<typeof CheckToolInclusionInputSchema>;

const CheckToolInclusionOutputSchema = z.object({
  includedTools: z
    .array(z.string())
    .describe('An array of tool names that are included in the codebase.'),
  missingTools: z
    .array(z.string())
    .describe('An array of tool names that are not included in the codebase.'),
});
export type CheckToolInclusionOutput = z.infer<typeof CheckToolInclusionOutputSchema>;

export async function checkToolInclusion(input: CheckToolInclusionInput): Promise<CheckToolInclusionOutput> {
  return checkToolInclusionFlow(input);
}

const checkToolInclusionPrompt = ai.definePrompt({
  name: 'checkToolInclusionPrompt',
  input: {schema: CheckToolInclusionInputSchema},
  output: {schema: CheckToolInclusionOutputSchema},
  prompt: `You are a code analysis expert. Given the codebase content and documentation content, determine which tools from the documentation are included in the codebase.

  Codebase Content:
  {{codebaseContent}}

  Documentation Content:
  {{documentationContent}}

  Tool Names to Check:
  {{#each toolNames}}
  - {{{this}}}
  {{/each}}

  Output the includedTools and missingTools arrays.
  Consider a tool included if it is explicitly mentioned or used in the codebase content.
  `,
});

const checkToolInclusionFlow = ai.defineFlow(
  {
    name: 'checkToolInclusionFlow',
    inputSchema: CheckToolInclusionInputSchema,
    outputSchema: CheckToolInclusionOutputSchema,
  },
  async input => {
    const {output} = await checkToolInclusionPrompt(input);
    return output!;
  }
);
