/**
 * @fileoverview This file initializes and configures the Google Generative AI client.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function runAIGeneration(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('[AI Debug] API Key exists:', !!apiKey);
  console.log('[AI Debug] First 10 chars of key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'none');

  // ✅ SOLUTION TEMPORAIRE - Fallback éducatif si pas de clé
  if (!apiKey || apiKey.length < 10) {
    console.warn('[AI Warning] Using fallback response - no valid API key');
    return `🧠 **Explication** : Je suis votre assistant pédagogique ! Actuellement, le service AI est en configuration.\n\n💡 **Conseil** : Pour une aide immédiate, consultez vos manuels ou posez votre question à votre professeur.\n\n✨ **Encouragement** : Votre curiosité est votre meilleur atout pour apprendre ! Continuez à poser des questions !`;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    console.log('[AI Debug] Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    console.log('[AI Success] Response received');
    return response.text();
    
  } catch (error: any) {
    console.error('[AI Generation Error Details]:', error);
    
    // ✅ MESSAGES D'ERREUR SPÉCIFIQUES
    if (error.message?.includes('API_KEY') || error.message?.includes('key invalid')) {
      throw new Error('Configuration: Clé API Gemini invalide. Vérifiez votre clé dans .env.local');
    }
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Quota API dépassé. Réessayez dans quelques minutes.');
    }
    if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('403')) {
      throw new Error('Accès refusé. Vérifiez que votre clé API est valide.');
    }
    
    // ✅ FALLBACK EN CAS D'ERREUR RÉSEAU
    console.warn('[AI Fallback] Using educational fallback due to API error');
    return `🧠 **Explication** : Je rencontre actuellement des difficultés techniques avec le service d'assistance.\n\n💡 **Conseil** : Pour progresser sur votre question "${prompt.substring(0, 50)}...", je vous suggère de :\n• Consulter vos cours et manuels\n• Échanger avec vos camarades\n• Demander à votre professeur\n\n✨ **Encouragement** : Ne vous découragez pas ! Chercher des réponses fait partie de l'apprentissage.`;
  }
}
