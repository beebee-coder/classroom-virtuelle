// src/components/DirectMessage.tsx
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFormStatus } from 'react-dom';
import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sendDirectMessage } from '@/lib/actions';
import type { FullConversation } from '@/lib/types';
import type { Message } from '@prisma/client';

type MessageWithStatus = Message & {
    status?: 'pending' | 'failed';
};

function DMMessage({ msg, currentUserId }: { msg: MessageWithStatus, currentUserId: string }) {
    const isCurrentUser = msg.senderId === currentUserId;

    return (
        <div className={cn("flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
            {!isCurrentUser && (
                <Avatar className="h-8 w-8">
                    <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div className="flex flex-col gap-1 max-w-xs sm:max-w-sm">
                <div className={cn("rounded-lg p-3 text-sm relative", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    <p className={cn("mt-2 text-xs opacity-60", isCurrentUser ? 'text-right' : 'text-left')}>{format(new Date(msg.createdAt), 'p')}</p>
                </div>
            </div>
            {isCurrentUser && (
                 <Avatar className="h-8 w-8">
                    <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" aria-label="Send message" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
    )
}

interface DirectMessageProps {
  conversation: FullConversation;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectMessage({ conversation, isOpen, onOpenChange }: DirectMessageProps) {
  const [messages, setMessages] = useState<MessageWithStatus[]>(conversation.messages);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const currentUserId = session?.user.id;
  const otherUser = currentUserId === conversation.initiatorId ? conversation.receiver : conversation.initiator;

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('div');
        if(viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        }
    }, 100);
  }, []);

  useEffect(() => {
    setMessages(conversation.messages);
    scrollToBottom('auto');
  }, [conversation.id, conversation.messages, scrollToBottom]);

  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages(prev => {
        if (!prev.some(msg => msg.id === newMessage.id)) {
            return [...prev, newMessage];
        }
        return prev;
    });
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(() => {
    if (!conversation.id) return;
    const channelName = `private-conversation-${conversation.id}`;
    
    try {
        const channel = pusherClient.subscribe(channelName);
        channel.bind('new-dm', handleNewMessage);
        return () => {
            pusherClient.unsubscribe(channelName);
        }
    } catch (error) {
        console.error("Pusher subscription failed:", error);
    }
  }, [conversation.id, handleNewMessage]);
  
  if (!currentUserId) return null;

  const sendMessageAction = async (formData: FormData) => {
    const messageContent = formData.get('message') as string;
    if (!messageContent.trim() || !session?.user) return;

    formRef.current?.reset();
    
    try {
        await sendDirectMessage(formData);
    } catch (error) {
      toast({
          variant: "destructive",
          title: "Erreur d'envoi",
          description: "Votre message n'a pas pu être envoyé."
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col h-full w-full sm:max-w-lg" data-radix-sheet-content>
        <SheetHeader>
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{otherUser.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>Conversation avec {otherUser.name}</SheetTitle>
                  <SheetDescription>Échange privé et confidentiel.</SheetDescription>
                </div>
            </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          <ScrollArea className="flex-1 pr-4 -mr-4" ref={scrollAreaRef}>
            <div className="space-y-6 py-4">
              {messages.map((msg) => (
                <DMMessage 
                    key={msg.id} 
                    msg={msg} 
                    currentUserId={currentUserId}
                />
              ))}
               {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                    Commencez la conversation.
                </div>
              )}
            </div>
          </ScrollArea>
          <form 
            ref={formRef}
            action={sendMessageAction}
            className="flex gap-2 border-t pt-4"
          >
            <input type="hidden" name="conversationId" value={conversation.id} />
            <Input
              name="message"
              placeholder="Écrivez un message..."
              autoComplete="off"
            />
            <SubmitButton />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
