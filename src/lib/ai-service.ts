// src/lib/ai-service.ts
import { IntelligentTutorService } from '@/lib/intelligent-tutor-service';

export class AIService {
  private tutor = new IntelligentTutorService();

  async chat(messages: any[]): Promise<string> {
    return this.tutor.chat(messages);
  }

  // Méthodes spécialisées
  async explainConcept(concept: string, level: string = '6ème'): Promise<string> {
    return this.chat([
      { role: 'user', content: `Explique-moi : ${concept}` }
    ]);
  }

  async helpWithExercise(subject: string, problem: string): Promise<string> {
    return this.chat([
      { role: 'user', content: `J'ai besoin d'aide en ${subject} : ${problem}` }
    ]);
  }
}

export const aiService = new AIService();
