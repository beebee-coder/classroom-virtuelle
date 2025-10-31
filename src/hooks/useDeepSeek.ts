// src/hooks/useDeepSeek.ts
'use client';
import { useState, useCallback } from 'react';
import { SmartTutorService } from '@/lib/smart-tutor-service';

// Le type est maintenant la seule chose exportée de ce fichier, en plus du hook
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Instance de notre service local
const tutorService = new SmartTutorService();

export function useDeepSeek() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // La fonction chat appelle maintenant notre service local
  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🧠 [HOOK] - Appel du service de tuteur intelligent local...');
      // Simule une petite latence pour une expérience utilisateur réaliste
      await new Promise(res => setTimeout(res, 300 + Math.random() * 400));
      const response = await tutorService.chat(messages);
      
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
    return chat([{ role: 'user', content: concept }]);
  }, [chat]);

  const helpWithHomework = useCallback(async (subject: string, question: string): Promise<string> => {
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
