// src/hooks/useDeepSeek.ts
'use client';
import { useState, useCallback } from 'react';
import { createClient } from '@modelcontextprotocol/sdk/client';
import type { ChatMessage } from '@/lib/deepseek-service';

// Créer une instance du client MCP.
// Il se connectera automatiquement au serveur défini dans mcp.json.
const mcpClient = createClient({
  name: 'classroom-app-client',
});

// Le serveur (tool provider) que nous voulons utiliser
const deepseekProvider = mcpClient.toolProvider('classroom-deepseek-mcp');

export function useDeepSeek() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (messages: ChatMessage[]): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🤖 Calling MCP tool "chat"...');
      // Appel standardisé via le protocole MCP
      const response = await deepseekProvider.chat({
        messages,
      });

      if (response.content[0].type !== 'text') {
        throw new Error('Unsupported response format from MCP server');
      }

      console.log('✅ Received response from MCP server');
      return response.content[0].text;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while calling the MCP tool';
      setError(errorMessage);
      console.error('❌ MCP Error:', err);
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
