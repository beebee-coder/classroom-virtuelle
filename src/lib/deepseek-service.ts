// src/lib/deepseek-service.ts
// Exporter le type depuis le service aussi pour cohérence
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
  export class DeepSeekService {
    private apiKey: string;
    private baseURL: string = 'https://api.deepseek.com/v1';
  
    constructor() {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is required');
      }
      this.apiKey = apiKey;
    }
  
    async chat(messages: ChatMessage[]): Promise<string> {
      try {
        console.log('🤖 Sending request to DeepSeek API...');
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
          })
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
        }
  
        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from DeepSeek API');
        }
  
        console.log('✅ Received response from DeepSeek');
        return data.choices[0].message.content;
  
      } catch (error) {
        console.error('❌ DeepSeek API error:', error);
        throw error;
      }
    }
  
    // Méthodes utilitaires pour des cas d'usage spécifiques
    async explainConcept(concept: string, gradeLevel: string = '6ème'): Promise<string> {
      return this.chat([
        {
          role: 'system',
          content: `Tu es un professeur de collège spécialisé pour les élèves de ${gradeLevel}. Sois clair, pédagogique et utilise des exemples concrets.`
        },
        {
          role: 'user',
          content: `Explique-moi le concept suivant de manière simple: ${concept}`
        }
      ]);
    }
  
    async helpWithHomework(subject: string, question: string): Promise<string> {
      return this.chat([
        {
          role: 'system',
          content: `Tu es un assistant pédagogique. Aide l'élève à comprendre sans donner la réponse directement. Pose des questions pour le guider.`
        },
        {
          role: 'user',
          content: `Sujet: ${subject}\nQuestion: ${question}`
        }
      ]);
    }
  
    async generateExercise(topic: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<string> {
      return this.chat([
        {
          role: 'system',
          content: `Tu es un professeur créant des exercices. Crée un exercice adapté au niveau de difficulté.`
        },
        {
          role: 'user',
          content: `Crée un exercice sur le thème "${topic}" avec un niveau de difficulté ${difficulty}`
        }
      ]);
    }
  }
  
  // Instance singleton
  let deepSeekInstance: DeepSeekService | null = null;
  
  export function getDeepSeekService(): DeepSeekService {
    if (!deepSeekInstance) {
      deepSeekInstance = new DeepSeekService();
    }
    return deepSeekInstance;
  }