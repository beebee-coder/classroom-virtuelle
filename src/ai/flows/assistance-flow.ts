/**
 * @fileoverview Defines a server action for providing educational assistance.
 */
'use server';

import { runAIGeneration } from '@/ai/config';
import { AssistanceOutput } from '@/ai/schemas';

export async function askAssistance(question: string): Promise<AssistanceOutput> {
  // ✅ VALIDATION DE LA QUESTION
  if (!question || question.trim().length < 2) {
    return {
      answer: "❓ **Question trop courte** : Pourriez-vous formuler une question plus précise ?\n\n💡 **Conseil** : Plus votre question est détaillée, mieux je pourrai vous aider !\n\n✨ **Encouragement** : N'hésitez pas à expliquer ce qui vous pose problème."
    };
  }

  if (question.length > 1000) {
    return {
      answer: "📝 **Question trop longue** : Pourriez-vous résumer votre question en quelques phrases ?\n\n💡 **Conseil** : Posez une question précise sur un concept spécifique.\n\n✨ **Encouragement** : C'est excellent de vouloir tout expliquer ! Commençons par un point précis."
    };
  }

  // ✅ PROMPT AMÉLIORÉ
  const prompt = `
Tu es Clary, un assistant pédagogique expert pour collégiens en France.
Ton rôle est d'aider à comprendre, pas de donner les réponses.

RÈGLES STRICTES :
- EXPLIQUE les concepts simplement avec des exemples concrets
- DONNE des indices et méthodes, JAMAIS la réponse finale
- UTILISE des métaphores et analogies
- SOIS encourageant et positif
- FORMAT en 3 parties claires

Question de l'élève : "${question}"

Structure ta réponse :
1. **Explication** 🧠 : Valide la question et explique le concept
2. **Méthode** 💡 : Donne une piste pour trouver la solution
3. **Motivation** ✨ : Encourage avec une phrase positive
  `;

  try {
    console.log('[Assistance] Processing question:', question.substring(0, 100));
    const generatedText = await runAIGeneration(prompt);
    
    // ✅ NETTOYAGE DE LA RÉPONSE
    const cleanAnswer = generatedText.trim();
    
    if (!cleanAnswer || cleanAnswer.length < 10) {
      throw new Error('Réponse AI vide');
    }
    
    return { answer: cleanAnswer };
    
  } catch (error) {
    console.error('[Assistance Error]', error);
    
    // ✅ FALLBACK ROBUSTE
    return {
      answer: `🧠 **Explication** : Je suis Clary, votre assistant ! Actuellement, je rencontre un problème technique.\n\n💡 **Conseil** : Pour "${question}", consultez vos ressources de cours ou échangez avec votre professeur.\n\n✨ **Encouragement** : Votre persévérance est la clé de la réussite ! Cette difficulté technique passera.`
    };
  }
}