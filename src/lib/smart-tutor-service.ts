// src/lib/smart-tutor-service.ts
export class SmartTutorService {
  private knowledgeBase = {
    math: {
      fractions: "Les fractions représentent des parties d'un tout. Ex: 3/4 = 3 parts sur 4. Parfait pour partager une pizza! 🍕",
      multiplication: "Multiplication = addition répétée. 3 × 4 = 3 + 3 + 3 + 3 = 12",
      division: "Division = partage équitable. 12 ÷ 4 = 3, car 12 objets en 4 groupes = 3 par groupe"
    },
    french: {
      conjugation: "Je mange, tu manges, il mange, nous mangeons, vous mangez, ils mangent",
      grammaire: "Le sujet fait l'action, le verbe l'exprime, le complément complète"
    },
    science: {
      photosynthese: "Plantes + Soleil 🌞 + Eau 💧 + CO2 → Nourriture + Oxygène",
      systeme_solaire: "Mercure, Vénus, Terre, Mars, Jupiter, Saturne, Uranus, Neptune"
    }
  };

  async chat(messages: any[]): Promise<string> {
    const question = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    // Réponses intelligentes basées sur les mots-clés
    if (question.includes('fraction')) return this.knowledgeBase.math.fractions;
    if (question.includes('multipl') || question.includes('fois')) return this.knowledgeBase.math.multiplication;
    if (question.includes('divis') || question.includes('partag')) return this.knowledgeBase.math.division;
    if (question.includes('conjug') || question.includes('verbe')) return this.knowledgeBase.french.conjugation;
    if (question.includes('gramm') || question.includes('accord')) return this.knowledgeBase.french.grammaire;
    if (question.includes('photosynthèse') || question.includes('plante')) return this.knowledgeBase.science.photosynthese;
    if (question.includes('planète') || question.includes('solaire')) return this.knowledgeBase.science.systeme_solaire;
    
    // Réponses pédagogiques génériques
    const genericResponses = [
      "Excellent question ! Dans Classroom Connector, je peux t'aider à comprendre tes leçons. As-tu un exercice spécifique ?",
      "Je vois que tu es curieux ! Utilise le tableau blanc pour visualiser tes idées - c'est génial pour apprendre !",
      "Bonne initiative de demander de l'aide ! Quel sujet étudies-tu actuellement ?",
      "N'hésite pas à noter cette question dans ton espace élève pour en parler avec ton professeur !",
      "Je peux t'aider à organiser ton travail. As-tu des difficultés avec un chapitre particulier ?"
    ];
    
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  }
}
