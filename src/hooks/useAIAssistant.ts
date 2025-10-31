// src/hooks/useAIAssistant.ts
'use client';
import { useState, useCallback } from 'react';
import { aiService } from '@/lib/ai-service';
import type { ChatMessage } from '@/lib/deepseek-service';

export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🧠 [HOOK] - Appel du service d\'IA local...');
      const response = await aiService.chat(messages);
      console.log('✅ [HOOK] - Réponse locale générée.');
      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue dans l\'assistant local.';
      console.error('❌ [HOOK] - Erreur:', errorMessage);
      setError(errorMessage);
      throw err; 
    } finally {
      setIsLoading(false);
    }
  }, []);

  const explainConcept = useCallback(async (concept: string): Promise<string> => {
    return chat([{ role: 'user', content: `Explique-moi le concept suivant: ${concept}` }]);
  }, [chat]);

  const helpWithHomework = useCallback(async (subject: string, question: string): Promise<string> => {
    return chat([{ role: 'user', content: `Aide-moi avec cet exercice de ${subject}: ${question}` }]);
  }, [chat]);

  return {
    chat,
    explainConcept,
    helpWithHomework,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
