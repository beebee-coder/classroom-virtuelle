/**
 * @fileoverview Flow d'assistance pédagogique avec Gemini, utilisant un appel direct à l'API.
 */
'use server';

import { GoogleAuth } from 'google-auth-library';

export async function askAssistance(question: string): Promise<{ answer: string }> {
  // Validation simple de la question
  if (!question?.trim() || question.length < 3) {
    return {
      answer: "❓ **Question trop courte** : Pourriez-vous formuler une question plus précise ?"
    };
  }

  const projectId = process.env.GOOGLE_PROJECT_ID;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !projectId) {
    console.error('❌ ERREUR CONFIGURATION: Clé API Gemini ou Project ID manquant.');
    throw new Error('Configuration API manquante.');
  }

  const model = 'gemini-1.5-flash-001'; // Modèle stable et confirmé
  const location = 'us-central1'; // Emplacement standard

  const prompt = `
Tu es "Clary", un assistant pédagogique expert pour collégiens français.
Ton rôle est d'aider à comprendre, pas de donner les réponses toutes faites.

QUESTION DE L'ÉLÈVE: "${question}"

GUIDELINES STRICTES:
- Explique le concept de manière simple et concrète.
- Utilise des exemples de la vie quotidienne.
- Donne des méthodes et indices, JAMAIS la réponse finale.
- Sois encourageant et positif.
- Structure en 3 parties claires.

STRUCTURE DE RÉPONSE:
1. 🧠 **Explication** : Valide la question et explique le concept clairement.
2. 💡 **Méthode** : Donne une piste pour trouver la solution soi-même.
3. ✨ **Encouragement** : Termine par une phrase motivante.

Langue: Français uniquement.
Style: Chaleureux, accessible, pédagogique.
  `;
  
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  };

  try {
    console.log(`📚 Assistance demandée pour: "${question.substring(0, 50)}..."`);
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API Gemini (${response.status}):`, errorText);
      throw new Error(`Erreur API Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiResponse) {
      throw new Error('Réponse vide de l\'API Gemini.');
    }

    console.log('✅ Assistance fournie avec succès');
    return { answer: aiResponse };

  } catch (error: any) {
    console.error('❌ Erreur dans askAssistance:', error);
    
    return {
      answer: `🧠 **Explication** : Je rencontre une difficulté technique momentanée.\n\n💡 **Conseil** : Pour "${question}", je vous suggère de :\n• Consulter vos cours et manuels.\n• Noter les points précis qui vous bloquent.\n• En parler avec votre professeur.\n\n✨ **Encouragement** : Les obstacles passent, mais votre curiosité reste ! Continuez !`
    };
  }
}
