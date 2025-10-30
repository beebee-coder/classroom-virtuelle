// src/lib/deepseek-service.ts

// Ce fichier ne contient plus de logique d'appel direct à l'API.
// Il ne sert qu'à exporter des types partagés pour assurer la cohérence
// entre le client (hook) and le serveur MCP.

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// L'instance singleton n'est plus nécessaire car le hook `useDeepSeek`
// utilise maintenant le client MCP.
