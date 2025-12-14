//src/components/AssistantChat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { askAssistance } from '@/ai/flows/assistance-flow';
import { cn } from '@/lib/utils';
import React from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await askAssistance(input);
      const assistantMessage: Message = { role: 'assistant', content: response.answer };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur de l'assistant IA:", error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Désolé, une erreur est survenue. Veuillez réessayer plus tard."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-card shadow-xl">
      <div className="flex-1 p-4 overflow-y-auto">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-6 pr-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full pt-10">
                <Sparkles className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-lg font-semibold">Commencez la conversation</h3>
                <p className="text-sm">Posez une question sur vos cours ! Par exemple : "Explique-moi le théorème de Pythagore"</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-4',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                      <Bot size={20} />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-md rounded-xl p-4 whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-primary/10 text-primary-foreground-dark'
                        : 'bg-muted'
                    )}
                  >
                    <p>{msg.content}</p>
                  </div>
                   {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User size={20} />
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-4 justify-start">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Bot size={20} />
                </div>
                <div className="max-w-md rounded-xl p-4 bg-muted flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="p-4 border-t bg-background/50">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Posez votre question ici..."
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[50px]"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="self-end px-6 py-3"
            size="lg"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Envoyer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
