// src/hooks/useNamedAbly.ts
'use client';

import { useAbly as useAblyOriginal } from './useAbly';

/**
 * A wrapper around the original useAbly hook that enforces the provision of a componentName.
 * This helps in debugging and preventing memory leaks related to anonymous listeners.
 * @param componentName The name of the component using the hook. Must be a non-empty string.
 */
export const useNamedAbly = (componentName: string) => {
  if (!componentName || typeof componentName !== 'string' || componentName.trim() === '') {
    // In a real application, you might throw an error. For debugging, a console error is very effective.
    console.error(
      '❌ FATAL: useNamedAbly requires a unique, non-empty componentName string.',
      'A component name was not provided, which can lead to connection leaks.',
      new Error().stack // Provides a stack trace to find the problematic component
    );
    // Provide a fallback to avoid a hard crash, but the error makes the issue visible.
    return useAblyOriginal('UnnamedComponentError');
  }

  if (componentName.toLowerCase().includes('mountmemo')) {
      console.error(`❌ DEBUG: Anonymous component ('mountMemo') detected using useNamedAbly. Please name your component.`, new Error().stack);
  }

  return useAblyOriginal(componentName);
};
