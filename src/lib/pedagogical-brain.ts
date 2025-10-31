// src/lib/pedagogical-brain.ts

// Type pour une réponse structurée de l'assistant
export interface PedagogicalResponse {
  title: string;
  explanation: string;
  example: string;
  tip: string;
  encouragement: string;
}

// Type pour un sujet avec ses mots-clés et sa logique de réponse
interface SubjectDefinition {
  keywords: string[];
  getResponse: (question: string) => PedagogicalResponse;
}

// --- Base de connaissances de notre "cerveau" ---
// C'est ici que nous ajoutons l'intelligence. Chaque entrée est un sujet.
const knowledgeBase: Record<string, SubjectDefinition> = {
  photosynthesis: {
    keywords: ['photosynthèse', 'plante', 'lumière', 'co2', 'oxygène'],
    getResponse: (question) => ({
      title: 'La Photosynthèse 🌿',
      explanation: "C'est le processus incroyable que les plantes utilisent pour se nourrir. Elles transforment la lumière du soleil, l'eau et le dioxyde de carbone (CO2) de l'air en énergie (sucre) pour grandir.",
      example: "Imagine une plante comme une petite usine. Elle aspire le CO2 de l'air avec ses feuilles, boit de l'eau avec ses racines, et utilise la lumière du soleil comme source d'énergie. En retour, elle relâche de l'oxygène, l'air que nous respirons !",
      tip: "Pense au mot : 'photo' (lumière) et 'synthèse' (fabriquer). La plante fabrique sa nourriture avec la lumière !",
      encouragement: "C'est un concept fondamental en biologie. Le comprendre, c'est comprendre comment la vie sur Terre est possible. Excellente question !",
    }),
  },
  fractions: {
    keywords: ['fraction', 'demi', 'tiers', 'quart', 'numérateur', 'dénominateur'],
    getResponse: (question) => ({
      title: 'Les Fractions 🍕',
      explanation: "Une fraction, c'est simplement une manière de représenter une partie d'un tout. On l'écrit avec deux nombres superposés.",
      example: "Imagine une pizza coupée en 8 parts égales. Si tu manges 1 part, tu as mangé 1/8 de la pizza. '1' est le numérateur (combien de parts tu prends) et '8' est le dénominateur (le nombre total de parts).",
      tip: "Le nombre du bas (dénominateur) te dit en combien de parts on a coupé le gâteau. Le nombre du haut (numérateur) te dit combien de parts tu as prises. Facile, non ?",
      encouragement: "Les fractions sont partout autour de nous ! En cuisine, en bricolage... Maîtriser ce concept va t'ouvrir plein de portes. Continue comme ça !",
    }),
  },
  default: {
    keywords: [],
    getResponse: (question) => ({
        title: "Voilà une question intéressante !",
        explanation: "Je ne suis pas encore un expert sur ce sujet spécifique, mais c'est une excellente occasion d'apprendre ensemble.",
        example: "Un bon réflexe quand on est bloqué, c'est de reformuler la question avec des mots plus simples. Par exemple, au lieu de demander 'Qu'est-ce que la gravité ?', tu pourrais demander 'Pourquoi les objets tombent-ils ?'.",
        tip: "Essaye de chercher les mots-clés de ta question sur internet ou dans ton livre de cours. Souvent, la réponse s'y cache !",
        encouragement: "N'oublie jamais que chaque question est le début d'une nouvelle découverte. C'est super d'être curieux !",
    }),
  }
};

/**
 * Analyse la question et retourne la meilleure réponse pédagogique possible.
 * @param question La question de l'élève.
 * @returns Une réponse structurée.
 */
function getPedagogicalResponse(question: string): PedagogicalResponse {
    const lowerCaseQuestion = question.toLowerCase();
    
    // Chercher le sujet qui correspond le mieux aux mots-clés
    for (const subjectKey in knowledgeBase) {
        if (subjectKey === 'default') continue;
        const subject = knowledgeBase[subjectKey];
        if (subject.keywords.some(keyword => lowerCaseQuestion.includes(keyword))) {
            console.log(`🧠 [Cerveau Pédagogique] - Sujet détecté: ${subjectKey}`);
            return subject.getResponse(question);
        }
    }
    
    console.log("🧠 [Cerveau Pédagogique] - Aucun sujet spécifique détecté, utilisant la réponse par défaut.");
    return knowledgeBase.default.getResponse(question);
}

/**
 * Le point d'entrée principal de notre service local.
 * Formate la réponse structurée en une chaîne de caractères lisible.
 * @param question La question de l'élève.
 * @returns Une chaîne de caractères formatée.
 */
export async function processLocalLLM(question: string): Promise<string> {
    // Simule une petite latence pour une expérience utilisateur plus réaliste
    await new Promise(res => setTimeout(res, 500 + Math.random() * 500));
    
    const response = getPedagogicalResponse(question);
    
    // Formater la réponse structurée en une seule chaîne de caractères
    return `
### ${response.title}

**Explication simple :**
${response.explanation}

**Exemple concret :**
${response.example}

**Astuce pour s'en souvenir :**
${response.tip}

> ${response.encouragement}
  `.trim();
}
