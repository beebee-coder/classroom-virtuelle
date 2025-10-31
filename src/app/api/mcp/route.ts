// src/app/api/mcp/route.ts
import { NextResponse } from 'next/server';
import { DeepSeekMCPAdapter, type MCPMessage } from '@/lib/deepseek-mcp-adapter';

// Initialiser l'adaptateur avec la clé API depuis les variables d'environnement
// La clé API reste sécurisée sur le serveur.
const deepSeek = new DeepSeekMCPAdapter(process.env.DEEPSEEK_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages: MCPMessage[] = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Le format des messages est invalide.' }, { status: 400 });
    }
    
    console.log('🤖 [API MCP] - Réception d\'une requête. Appel de DeepSeek...');
    
    // Utiliser l'adaptateur pour obtenir la réponse de l'IA
    const aiResponse = await deepSeek.processMCPRequest(messages);
    
    console.log('✅ [API MCP] - Réponse de DeepSeek reçue.');
    
    // Retourner la réponse au format JSON
    return NextResponse.json({ response: aiResponse });

  } catch (error) {
    console.error('❌ [API MCP] - Erreur interne:', error);
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
