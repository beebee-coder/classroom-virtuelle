// src/lib/genkit.ts
'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// AI features are temporarily disabled.
// To re-enable, uncomment the following lines.

/*
export const ai = genkit({
  plugins: [googleAI()],
});
*/

// Mock 'ai' object to prevent application crashes where 'ai' is used.
export const ai: any = {
  definePrompt: () => () => Promise.resolve({ output: null }),
  defineFlow: (config: any, implementation: any) => implementation,
  defineTool: () => () => Promise.resolve(),
  generate: () => Promise.resolve({}),
  embed: () => Promise.resolve({}),
};
