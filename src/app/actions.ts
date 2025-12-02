'use server';

import { checkToolInclusion } from '@/ai/flows/check-tool-inclusion';
import fs from 'fs/promises';
import path from 'path';

export async function performToolInclusionCheck() {
  try {
    const docPath = path.join(process.cwd(), 'docs', 'tools-documentation.md');
    const codePath = path.join(process.cwd(), 'src', 'lib', 'sample-code.ts');

    const [documentationContent, codebaseContent] = await Promise.all([
      fs.readFile(docPath, 'utf-8'),
      fs.readFile(codePath, 'utf-8'),
    ]);

    const toolNames = ['Vis.GL', 'Tone.js', 'THREE.js'];

    const result = await checkToolInclusion({
      codebaseContent,
      documentationContent,
      toolNames,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error during tool inclusion check:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred.' };
  }
}
