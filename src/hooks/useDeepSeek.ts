// src/hooks/useDeepSeek.ts
'use client';
import { useState, useCallback } from 'react';
import { processLocalLLM } from '@/lib/pedagogical-brain';

// Le type est maintenant la seule chose exportée de ce fichier, en plus du hook
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useDeepSeek() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La fonction chat est maintenant asynchrone et appelle notre "cerveau" local
  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Nous ne prenons que la dernière question de l'utilisateur pour notre logique simple
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
      }
      
      console.log('🧠 [HOOK] - Appel du cerveau pédagogique local...');
      const response = await processLocalLLM(lastUserMessage.content);
      
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
  }, []); // Aucune dépendance

  const explainConcept = useCallback(async (concept: string): Promise<string> => {
    return chat([{ role: 'user', content: concept }]);
  }, [chat]);

  const helpWithHomework = useCallback(async (subject: string, question: string): Promise<string> => {
     // Concaténer le sujet et la question pour l'analyse par notre cerveau local
    return chat([{ role: 'user', content: `${subject}: ${question}` }]);
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
