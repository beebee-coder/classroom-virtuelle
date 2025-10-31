// src/hooks/useDeepSeek.ts
'use client';
import { useState, useCallback } from 'react';

// Définir le type ici aussi pour plus de sécurité
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function useDeepSeek() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🗣️ [HOOK] - Appel de la route API /api/mcp...');
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ [HOOK] - Réponse reçue de /api/mcp.');
      return data.response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la communication avec l\'assistant.';
      console.error('❌ [HOOK] - Erreur:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
