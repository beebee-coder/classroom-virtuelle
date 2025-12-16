// src/components/ChatSheet.tsx
'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import Ably from 'ably';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MessageSquare, Send, Loader2, Smile, Trash2 } from 'lucide-react';
import { getMessages, sendMessage, toggleReaction, deleteChatHistory } from '@/lib/actions/chat.actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import type { Message, Reaction, User, Role } from '@prisma/client';
import { useNamedAbly } from '@/hooks/useNamedAbly';
import { getClassChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';

const EMOJIS = ['👍', '❤️', '😂', '😯', '😢', '🤔'];

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
type MessageWithReactions = Message & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

interface ChatSheetProps {
  classroomId: string;
  userId: string;
  userRole: Role;
}

export function ChatSheet({ classroomId, userId, userRole }: ChatSheetProps) {
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, startSending] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, (message: Ably.Message) => void>>(new Map());
  const isMountedRef = useRef(true);

  const { client: ablyClient, isConnected: ablyConnected, connectionState } = useNamedAbly('ChatSheet');
  
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';
  const ablyReady = ablyClient && ablyConnected && !ablyLoading;

  const fetchMessages = useCallback(async () => {
    if (!classroomId || !isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      const initialMessages = await getMessages(classroomId);
      
      if (Array.isArray(initialMessages)) {
        setMessages(initialMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: 'Impossible de charger les messages.' 
      });
      setMessages([]);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [classroomId, toast]);

  useEffect(() => {
    if (isOpen && classroomId) {
      fetchMessages();
    }
  }, [isOpen, classroomId, fetchMessages]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAbly();
    };
  }, []);

  const cleanupAbly = useCallback(() => {
    if (channelRef.current) {
      listenersRef.current.forEach((handler, eventName) => {
        try {
          channelRef.current?.unsubscribe(eventName, handler);
        } catch (error) {
          console.warn(`⚠️ [CHAT] Erreur lors du désabonnement de ${eventName}:`, error);
        }
      });
      
      listenersRef.current.clear();
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!classroomId || !isOpen || !ablyReady) {
      return;
    }

    const channelName = getClassChannelName(classroomId);
    
    if (channelRef.current?.name === channelName) {
      return;
    }

    cleanupAbly();

    const channel = ablyClient.channels.get(channelName);
    channelRef.current = channel;
      
    const createMessageHandler = () => {
      const handler = (message: Ably.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as MessageWithReactions;
        setMessages((prev) => {
          if (prev.some(msg => msg.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
      };
      listenersRef.current.set(AblyEvents.NEW_MESSAGE, handler);
      return handler;
    };

    const createReactionHandler = () => {
      const handler = (message: Ably.Message) => {
        if (!isMountedRef.current) return;
        
        const data = message.data as { 
          messageId: string; 
          reaction: ReactionWithUser; 
          action: 'added' | 'removed'; 
        };
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            let newReactions = [...msg.reactions];
            
            if (data.action === 'added') {
              const existingIndex = newReactions.findIndex(
                (r: ReactionWithUser) => r.emoji === data.reaction.emoji && r.userId === data.reaction.userId
              );
              if (existingIndex === -1) {
                newReactions.push(data.reaction);
              }
            } else {
              newReactions = newReactions.filter(
                (r: ReactionWithUser) => !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)
              );
            }
            return { ...msg, reactions: newReactions };
          }
          return msg;
        }));
      };
      listenersRef.current.set(AblyEvents.REACTION_UPDATE, handler);
      return handler;
    };
      
    const createHistoryHandler = () => {
      const handler = () => {
        if (!isMountedRef.current) return;
        
        setMessages([]);
        toast({ 
          title: "Historique effacé", 
          description: "Le professeur a effacé l'historique de la conversation." 
        });
      };
      listenersRef.current.set(AblyEvents.HISTORY_CLEARED, handler);
      return handler;
    };

    channel.subscribe(AblyEvents.NEW_MESSAGE, createMessageHandler());
    channel.subscribe(AblyEvents.REACTION_UPDATE, createReactionHandler());
    channel.subscribe(AblyEvents.HISTORY_CLEARED, createHistoryHandler());


    return cleanupAbly;
  }, [classroomId, isOpen, toast, ablyClient, ablyReady, cleanupAbly]);

  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0 && isMountedRef.current) {
      const scrollToBottom = () => {
        try {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTo({ 
              top: scrollContainer.scrollHeight, 
              behavior: 'smooth' 
            });
          }
        } catch (error) {
          console.warn('⚠️ [CHAT] Erreur lors du scroll automatique:', error);
        }
      };

      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !classroomId) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');
    
    startSending(async () => {
      try {
        const formData = new FormData();
        formData.append('message', messageToSend);
        formData.append('classroomId', classroomId);
        
        const result = await sendMessage(formData);
        if (!result.success) {
          throw new Error(result.error || 'Erreur lors de l\'envoi');
        }

      } catch (error) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur', 
          description: "Le message n'a pas pu être envoyé." 
        });
        if (isMountedRef.current) {
          setNewMessage(messageToSend);
        }
      }
    });
  }, [newMessage, isSending, classroomId, toast]);

  const handleReactionClick = useCallback(async (messageId: string, emoji: string) => {
    if (!isMountedRef.current) return;
    
    const originalMessages = [...messages];
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(
          (r: ReactionWithUser) => r.userId === userId && r.emoji === emoji
        );
        
        let newReactions;
        if (existingReaction) {
          newReactions = msg.reactions.filter((r: ReactionWithUser) => r.id !== existingReaction.id);
        } else {
          newReactions = [...msg.reactions, { 
            id: `temp-${Date.now()}`, 
            emoji, 
            userId, 
            messageId, 
            user: { id: userId, name: 'Vous' } 
          } as ReactionWithUser];
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
    
    try {
      await toggleReaction(messageId, emoji);
    } catch (error) {
      if (isMountedRef.current) {
        setMessages(originalMessages);
      }
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: "La réaction n'a pas pu être enregistrée." 
      });
    }
  }, [messages, userId, toast]);

  const handleDeleteHistory = useCallback(async () => {
    try {
      await deleteChatHistory(classroomId);
      toast({ 
        title: 'Succès', 
        description: "L'historique du chat a été effacé." 
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Erreur', 
        description: "Impossible d'effacer l'historique." 
      });
    }
  }, [classroomId, toast]);

  const getReactionSummary = useCallback((reactions: ReactionWithUser[]) => {
    const summary: Record<string, number> = {};
    reactions.forEach((reaction: ReactionWithUser) => {
      summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
    });
    return summary;
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <MessageSquare className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-2 border-b">
          <SheetTitle>Discussion de Classe</SheetTitle>
          <SheetDescription>
            Échangez avec votre professeur et vos camarades.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Chargement...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <p className="text-muted-foreground text-center">
                  Aucun message pour le moment.<br />
                  Soyez le premier à envoyer un message !
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((msg) => {
                  const isOwnMessage = msg.senderId === userId;
                  const reactionSummary = getReactionSummary(msg.reactions);
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        'flex items-end gap-2 group',
                        isOwnMessage && 'flex-row-reverse'
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage 
                          src={msg.sender.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.senderId}`} 
                          alt={msg.sender.name || 'Utilisateur'}
                        />
                        <AvatarFallback>
                          {msg.sender.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={cn(
                        'rounded-lg p-3 max-w-xs relative',
                        isOwnMessage 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}>
                        <p className="text-sm font-semibold mb-1">
                          {isOwnMessage ? 'Vous' : msg.sender.name}
                        </p>
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {msg.message}
                        </p>
                        <p className="text-xs opacity-70 mt-1 text-right">
                          {format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}
                        </p>
                        
                        <div className={cn(
                          'absolute -bottom-3 flex gap-1',
                          isOwnMessage ? 'right-2' : 'left-2'
                        )}>
                          {Object.keys(reactionSummary).length > 0 && (
                            <div className="flex gap-1 bg-background border rounded-full px-2 py-0.5">
                              {Object.entries(reactionSummary).map(([emoji, count]) => (
                                <span key={emoji} className="text-xs">
                                  {emoji} {count}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background"
                              >
                                <Smile className="h-3 w-3" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-1 w-auto" align={isOwnMessage ? 'end' : 'start'}>
                              <div className="flex gap-1">
                                {EMOJIS.map(emoji => (
                                  <Button 
                                    key={emoji} 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-lg hover:scale-110 transition-transform"
                                    onClick={() => handleReactionClick(msg.id, emoji)}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
        
        <SheetFooter className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex gap-2 w-full items-center">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              disabled={isSending}
              autoComplete="off"
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isSending || !newMessage.trim()}
              size="icon"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            
            {userRole === 'PROFESSEUR' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Vider le chat ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible et supprimera tous les messages pour tous les participants.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteHistory} 
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Vider
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
