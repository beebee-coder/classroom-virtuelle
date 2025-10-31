// src/lib/ai-service.ts
import { SmartTutorService } from './smart-tutor-service';

export class AIService {
  private tutor = new SmartTutorService();

  async chat(messages: any[]): Promise<string> {
    return this.tutor.chat(messages);
  }
}

export const aiService = new AIService();
