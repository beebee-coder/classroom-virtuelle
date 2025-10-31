// src/lib/intelligent-tutor-service.ts
export class IntelligentTutorService {
  private educationalPatterns = {
    subjects: ['mathématiques', 'français', 'sciences', 'histoire', 'géographie', 'anglais'],
    levels: ['6ème', '5ème', '4ème', '3ème'],
    actions: ['explique', 'aide', 'comprendre', 'résoudre', 'apprendre', 'réviser']
  };

  async chat(messages: any[]): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const conversationContext = this.analyzeConversation(messages);
    
    return this.generateIntelligentResponse(lastMessage, conversationContext);
  }

  private analyzeConversation(messages: any[]): any {
    const context = {
      subject: this.detectSubject(messages),
      level: this.detectLevel(messages),
      intent: this.detectIntent(messages),
      previousQuestions: this.extractPreviousQuestions(messages)
    };
    
    return context;
  }

  private detectSubject(messages: any[]): string {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    
    const subjectKeywords = {
      'mathématiques': ['math', 'calcul', 'nombre', 'équation', 'fraction', 'géométrie'],
      'français': ['français', 'grammaire', 'conjugaison', 'orthographe', 'lecture', 'rédaction'],
      'sciences': ['science', 'physique', 'chimie', 'biologie', 'expérience', 'laboratoire'],
      'histoire': ['histoire', 'date', 'siècle', 'guerre', 'roi', 'révolution'],
      'géographie': ['géographie', 'carte', 'pays', 'continent', 'climat', 'ville']
    };

    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return subject;
      }
    }
    
    return 'général';
  }

  private detectLevel(messages: any[]): string {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    const level = this.educationalPatterns.levels.find(l => text.includes(l));
    return level || '6ème'; // Niveau par défaut
  }

  private detectIntent(messages: any[]): string {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    
    if (lastMessage.includes('explique') || lastMessage.includes('comprendre')) return 'explanation';
    if (lastMessage.includes('aide') || lastMessage.includes('résoudre')) return 'help';
    if (lastMessage.includes('exercice') || lastMessage.includes('devoir')) return 'exercise';
    if (lastMessage.includes('réviser') || lastMessage.includes('préparer')) return 'revision';
    
    return 'general';
  }

  private extractPreviousQuestions(messages: any[]): string[] {
    return messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .slice(-3); // Dernières 3 questions
  }

  private generateIntelligentResponse(question: string, context: any): string {
    const { subject, level, intent, previousQuestions } = context;
    
    // Structure de réponse pédagogique
    const responseStructure = this.buildResponseStructure(intent, subject, level);
    
    // Générer le contenu basé sur le contexte
    const content = this.generateEducationalContent(question, context);
    
    return `${responseStructure.intro}

${content.main}

${responseStructure.advice}

${responseStructure.encouragement}`;
  }

  private buildResponseStructure(intent: string, subject: string, level: string) {
    const structures = {
      explanation: {
        intro: `🔍 **Explication pour un élève de ${level}**`,
        advice: `💡 **Conseil pédagogique** : Pour mieux comprendre, essaie de reformuler cette explication avec tes propres mots !`,
        encouragement: `🎯 **Prochaine étape** : Maintenant que tu as compris le concept, essaie de l'appliquer dans un exercice !`
      },
      help: {
        intro: `🤝 **Aide aux devoirs - ${subject}**`,
        advice: `💡 **Méthode de travail** : Commence par bien lire l'énoncé et souligne les informations importantes.`,
        encouragement: `✨ **Tu peux le faire !** N'hésite pas à demander à ton professeur si tu as encore des questions.`
      },
      exercise: {
        intro: `📚 **Accompagnement exercice - ${subject}**`,
        advice: `📝 **Approche recommandée** : Lis attentivement chaque question et vérifie tes réponses étape par étape.`,
        encouragement: `🏆 **Bravo pour ta persévérance !** Chaque exercice te rapproche de la maîtrise du sujet.`
      },
      general: {
        intro: `👋 **Assistant Pédagogique - ${level}**`,
        advice: `📖 **Conseil d'apprentissage** : Prends des notes pendant que tu étudies, ça aide à mieux mémoriser !`,
        encouragement: `🌟 **Continue comme ça !** La curiosité est le premier pas vers la connaissance.`
      }
    };

    return (structures as any)[intent] || structures.general;
  }

  private generateEducationalContent(question: string, context: any): { main: string } {
    const { subject, level } = context;
    
    // Générer du contenu éducatif dynamique basé sur le sujet et le niveau
    const subjectContents = {
      mathématiques: {
        beginner: `En mathématiques, l'important est de comprendre les concepts de base. Pour la question "${question}", je te suggère de :
- Identifier les nombres et opérations en jeu
- Appliquer les règles mathématiques étape par étape
- Vérifier ton calcul avec une estimation

Les mathématiques, c'est comme un jeu où chaque règle a sa logique !`,
        intermediate: `Approfondissons les mathématiques ! Pour "${question}", concentrons-nous sur :
- La méthodologie de résolution
- Les propriétés mathématiques applicables
- Les pièges à éviter

N'oublie pas que la pratique régulière est la clé du succès en maths.`
      },
      français: {
        beginner: `En français, travaillons sur la langue ! Pour "${question}", portons attention à :
- La structure des phrases
- L'orthographe et la grammaire
- Le vocabulaire approprié

La maîtrise du français ouvre les portes de tous les autres apprentissages !`,
        intermediate: `Approfondissons ta question "${question}" en français :
- Analysons les règles grammaticales
- Étudions le style et la formulation
- Voyons les exceptions et particularités

Chaque règle de français a sa raison d'être !`
      },
      sciences: {
        beginner: `En sciences, observons le monde qui nous entoure ! Pour "${question}":
- Partons de l'observation
- Formulons des hypothèses
- Vérifions par l'expérience

La science, c'est la curiosité transformée en connaissance !`,
        intermediate: `Approfondissons les sciences avec ta question "${question}":
- Relions les concepts entre eux
- Comprends les mécanismes sous-jacents
- Applique la méthode scientifique

Chaque découverte scientifique commence par une question !`
      }
    };

    const levelKey = level.includes('6') || level.includes('5') ? 'beginner' : 'intermediate';
    const subjectContent = (subjectContents as any)[subject];
    
    if (subjectContent) {
      return { main: subjectContent[levelKey] };
    }

    // Réponse générique intelligente
    return {
      main: `Je vois que tu t'intéresses à "${question}". C'est une excellente démarche d'apprentissage !

En tant qu'assistant pédagogique pour un élève de ${level}, je te recommande de :
1. **Bien comprendre les concepts de base** de ton cours
2. **Pratiquer régulièrement** avec des exercices
3. **Poser des questions** à ton professeur quand tu as un doute

La persévérance est la clé de la réussite scolaire ! 📚`
    };
  }

  // Méthode pour enrichir dynamiquement les réponses
  private addInteractiveElements(context: any): string {
    const elements = [
      `🔄 **Essaie cette méthode** : Reformule la question avec tes propres mots`,
      `📝 **Astuce** : Utilise le tableau blanc de Classroom Connector pour visualiser`,
      `👥 **Collaboration** : Partage ta question avec un camarade de classe`,
      `⏱️ **Gestion du temps** : Prends 5 minutes pour réfléchir avant de demander de l'aide`
    ];
    
    return elements[Math.floor(Math.random() * elements.length)];
  }
}
