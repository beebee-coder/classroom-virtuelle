/**
 * @fileoverview Flow d'assistance pédagogique avec Gemini, utilisant un appel direct à l'API.
 */
'use server';

export async function askAssistance(question: string): Promise<{ answer: string }> {
  // Validation simple de la question
  if (!question?.trim() || question.length < 3) {
    return {
      answer: "❓ **Question trop courte** : Pourriez-vous formuler une question plus précise ?"
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ ERREUR CONFIGURATION: Clé API Gemini manquante.');
    throw new Error('Configuration API manquante.');
  }

  // Utilisation d'un modèle stable et confirmé
  const model = 'gemini-pro'; 

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
  
  // CORRECTION : Le format du payload doit inclure le rôle 'user'.
  const requestBody = {
    contents: [
      {
        role: 'user', // Rôle de l'utilisateur
        parts: [{ text: prompt }]
      }
    ]
  };

  try {
    console.log(`📚 Assistance demandée pour: "${question.substring(0, 50)}..."`);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
