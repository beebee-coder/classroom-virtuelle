/**
 * @fileoverview Configuration réelle pour Google Gemini API
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function runAIGeneration(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  // 🔴 VÉRIFICATION CRITIQUE - Avez-vous mis la clé dans .env.local ?
  if (!apiKey || !apiKey.startsWith('AIza')) {
    console.error('❌ ERREUR CONFIGURATION: Clé API manquante ou invalide');
    console.error('💡 SOLUTION: Ajoutez GEMINI_API_KEY=votre_clé_réelle dans .env.local');
    throw new Error('Configuration API manquante. Vérifiez votre clé Gemini.');
  }

  try {
    console.log('🔄 Appel de l\'API Gemini...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.log('✅ Réponse Gemini reçue avec succès');
    return response.text();

  } catch (error: any) {
    console.error('❌ Erreur API Gemini:', {
      message: error.message,
      status: error.status,
      code: error.code
    });

    // Gestion d'erreurs détaillée
    if (error.message?.includes('API_KEY_INVALID')) {
      throw new Error('Clé API invalide. Vérifiez votre clé Gemini dans Google AI Studio.');
    }
    if (error.message?.includes('quota')) {
      throw new Error('Quota API dépassé. Vérifiez votre usage dans Google Cloud Console.');
    }
    if (error.message?.includes('PERMISSION_DENIED')) {
      throw new Error('Permission refusée. Vérifiez que l\'API Gemini est activée.');
    }
    if (error.message?.includes('503') || error.message?.includes('service unavailable')) {
      throw new Error('Service temporairement indisponible. Réessayez dans quelques minutes.');
    }

    throw new Error(`Erreur API: ${error.message || 'Problème de connexion'}`);
  }
}
