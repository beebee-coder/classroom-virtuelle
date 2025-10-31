/**
 * @fileoverview Flow d'assistance pédagogique avec Gemini réel
 */
'use server';

import { runAIGeneration } from '@/ai/config';

export async function askAssistance(question: string): Promise<{ answer: string }> {
  // Validation de la question
  if (!question?.trim() || question.length < 3) {
    return {
      answer: "❓ **Question trop courte** : Pourriez-vous formuler une question plus précise ?\n\n💡 **Conseil** : Plus votre question est détaillée, mieux je pourrai vous aider !\n\n✨ **Encouragement** : N'hésitez pas à expliquer ce qui vous pose problème."
    };
  }

  // Prompt optimisé pour Gemini
  const prompt = `
Tu es "Clary", un assistant pédagogique expert pour collégiens français.
Ton rôle est d'aider à comprendre, pas de donner les réponses toutes faites.

QUESTION DE L'ÉLÈVE: "${question}"

GUIDELINES STRICTES:
- Explique le concept de manière simple et concrète
- Utilise des exemples de la vie quotidienne
- Donne des méthodes et indices, JAMAIS la réponse finale
- Sois encourageant et positif
- Structure en 3 parties claires

STRUCTURE DE RÉPONSE:
1. 🧠 **Explication** : Valide la question et explique le concept clairement
2. 💡 **Méthode** : Donne une piste pour trouver la solution soi-même
3. ✨ **Encouragement** : Termine par une phrase motivante

Langue: Français uniquement
Style: Chaleureux, accessible, pédagogique
  `;

  try {
    console.log(`📚 Assistance demandée: "${question.substring(0, 50)}..."`);
    
    const aiResponse = await runAIGeneration(prompt);
    
    // Nettoyage de la réponse
    const cleanAnswer = aiResponse.trim();
    
    if (!cleanAnswer) {
      throw new Error('Réponse vide de l\'API');
    }

    console.log('✅ Assistance fournie avec succès');
    return { answer: cleanAnswer };

  } catch (error: any) {
    console.error('❌ Erreur dans askAssistance:', error);
    
    // Fallback éducatif intelligent
    return {
      answer: `🧠 **Explication** : Je rencontre une difficulté technique momentanée.\n\n💡 **Conseil** : Pour "${question}", je vous suggère de :\n• Consulter vos cours et manuels\n• Noter les points précis qui vous bloquent\n• En parler avec votre professeur\n\n✨ **Encouragement** : Les obstacles techniques passent, mais votre curiosité reste ! Continuez !`
    };
  }
}