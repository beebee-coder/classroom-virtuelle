// src/hooks/useDeepSeek.ts
'use client';
import { useState, useCallback } from 'react';
import { getDeepSeekService } from '@/lib/deepseek-service';

// Exporter le type
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useDeepSeek() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = getDeepSeekService();

  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await service.chat(messages);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const explainConcept = useCallback(async (concept: string, gradeLevel?: string): Promise<string> => {
    return chat([
      {
        role: 'system',
        content: `Tu es un professeur de collège spécialisé pour les élèves de ${gradeLevel || '6ème'}. Sois clair, pédagogique et utilise des exemples concrets.`
      },
      {
        role: 'user',
        content: `Explique-moi le concept suivant de manière simple: ${concept}`
      }
    ]);
  }, [chat]);

  const helpWithHomework = useCallback(async (subject: string, question: string): Promise<string> => {
    return chat([
      {
        role: 'system',
        content: `Tu es un assistant pédagogique. Aide l'élève à comprendre sans donner la réponse directement. Pose des questions pour le guider.`
      },
      {
        role: 'user',
        content: `Sujet: ${subject}\nQuestion: ${question}`
      }
    ]);
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