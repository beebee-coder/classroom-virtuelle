// src/components/DeepSeekChat.tsx
'use client';
import { useState } from 'react';
import { useDeepSeek } from '@/hooks/useDeepSeek';
import type { ChatMessage } from '@/hooks/useDeepSeek'; // Import correct du type

export function DeepSeekChat() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const { chat, isLoading, error, clearError } = useDeepSeek();

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: message };
    const updatedConversation = [...conversation, userMessage];
    
    setConversation(updatedConversation);
    setMessage('');
    clearError();

    try {
      const response = await chat(updatedConversation);
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: response 
      };
      
      setConversation([...updatedConversation, assistantMessage]);
    } catch {
      // L'erreur est déjà gérée par le hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setConversation([]);
    clearError();
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="font-semibold">Assistant DeepSeek</h3>
        </div>
        <button
          onClick={clearChat}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Effacer
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {conversation.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>👋 Bonjour ! Je suis ton assistant DeepSeek.</p>
            <p className="text-sm">Pose-moi une question sur tes leçons !</p>
          </div>
        )}
        
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone de saisie */}
      <div className="p-4 border-t">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question..."
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="self-end px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}