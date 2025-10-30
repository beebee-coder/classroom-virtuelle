// lib/deepseek-mcp-adapter.ts
export interface MCPMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }
  
  export class DeepSeekMCPAdapter {
    private apiKey: string;
    private baseURL: string;
  
    constructor(apiKey: string, baseURL: string = 'https://api.deepseek.com/v1') {
      if (!apiKey) {
        throw new Error('DeepSeek API key is required');
      }
      this.apiKey = apiKey;
      this.baseURL = baseURL;
    }
  
    async processMCPRequest(messages: MCPMessage[]): Promise<string> {
      try {
        console.log('🔗 Sending request to DeepSeek API...');
        
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
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from DeepSeek API');
        }
  
        console.log('✅ Received response from DeepSeek');
        return data.choices[0].message.content;
  
      } catch (error) {
        console.error('❌ DeepSeek API error:', error);
        throw error;
      }
    }
  
    // Méthode utilitaire pour les conversations simples
    async chat(question: string, systemPrompt?: string): Promise<string> {
      const messages: MCPMessage[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: question });
      
      return await this.processMCPRequest(messages);
    }
  }