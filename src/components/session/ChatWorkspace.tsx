// src/components/session/ChatWorkspace.tsx
'use client';

import { useState, useEffect, useRef, useTransition, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { MessageSquare, Send, Loader2, Smile, Trash2 } from 'lucide-react';
import { getMessages, sendMessage, toggleReaction, deleteChatHistory } from '@/lib/actions/chat.actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import type { Message as PrismaMessage, Reaction, User, Role } from '@prisma/client';
import { useNamedAbly } from '@/hooks/useNamedAbly';
import { getClassChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import Ably, {
  type RealtimeChannel,
  type Message as AblyMessage,
} from 'ably';

const EMOJIS = ['👍', '❤️', '😂', '😯', '😢', '🤔'];

type ReactionWithUser = Reaction & { user: Pick<User, 'id' | 'name'> };
type MessageWithReactions = PrismaMessage & {
    sender: Pick<User, 'id' | 'name' | 'image'>;
    reactions: ReactionWithUser[];
};

interface ChatWorkspaceProps {
  classroomId: string;
  userId: string;
  userRole: Role;
}

export function ChatWorkspace({ classroomId, userId, userRole }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, startSending] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listenersRef = useRef<Map<string, (message: AblyMessage) => void>>(new Map());
  const isMountedRef = useRef(true);
  const operationLockRef = useRef(false);

  const { client: ablyClient, isConnected: ablyConnected, connectionState } = useNamedAbly('ChatWorkspace');
  
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
    if (classroomId) {
      fetchMessages();
    }
  }, [classroomId, fetchMessages]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanupAbly();
    };
  }, []);

  const cleanupAbly = useCallback(async () => {
    const channel = channelRef.current;
    if (!channel) return;
    
    operationLockRef.current = true;

    try {
        listenersRef.current.forEach((handler, eventName) => {
          channel.unsubscribe(eventName, handler);
        });
        listenersRef.current.clear();
        
        if (channel.state === 'attached' || channel.state === 'attaching') {
            await channel.detach();
        }
    } catch (error) {
        console.warn(`❌ [CHAT WORKSPACE] Erreur lors du nettoyage du canal ${channel.name}:`, error);
    } finally {
        channelRef.current = null;
        operationLockRef.current = false;
    }
}, []);

  const messageHandler = useCallback((message: AblyMessage) => {
    if (!isMountedRef.current) return;
    const data = message.data as MessageWithReactions;
    setMessages((prev) => prev.some(msg => msg.id === data.id) ? prev : [...prev, data]);
  }, []);

  const reactionHandler = useCallback((message: AblyMessage) => {
    if (!isMountedRef.current) return;
    const data = message.data as { messageId: string; reaction: ReactionWithUser; action: 'added' | 'removed'; };
    setMessages(prev => prev.map(msg => {
      if (msg.id === data.messageId) {
        let newReactions = [...msg.reactions];
        if (data.action === 'added') {
          if (newReactions.findIndex(r => r.emoji === data.reaction.emoji && r.userId === data.reaction.userId) === -1) {
            newReactions.push(data.reaction);
          }
        } else {
          newReactions = newReactions.filter(r => !(r.emoji === data.reaction.emoji && r.userId === data.reaction.userId));
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
  }, []);

  const historyHandler = useCallback(() => {
    if (!isMountedRef.current) return;
    setMessages([]);
    toast({ title: "Historique effacé", description: "Le professeur a effacé l'historique de la conversation." });
  }, [toast]);

  const eventHandlers = useMemo(() => ({
    [AblyEvents.NEW_MESSAGE]: messageHandler,
    [AblyEvents.REACTION_UPDATE]: reactionHandler,
    [AblyEvents.HISTORY_CLEARED]: historyHandler,
  }), [messageHandler, reactionHandler, historyHandler]);

  useEffect(() => {
    if (!classroomId || !ablyReady) {
        return;
    }

    const channelName = getClassChannelName(classroomId);

    if (channelRef.current?.name === channelName) {
        return;
    }

    const setupChannel = async () => {
        if (operationLockRef.current) {
            setTimeout(setupChannel, 100);
            return;
        }

        operationLockRef.current = true;

        await cleanupAbly();

        const channel = ablyClient.channels.get(channelName);
        channelRef.current = channel;

        try {
            await channel.attach();
            
            if (isMountedRef.current) {
                Object.entries(eventHandlers).forEach(([event, handler]) => {
                  channel.subscribe(event, handler);
                  listenersRef.current.set(event, handler);
                });
            }
        } catch (error) {
            console.error(`❌ [CHAT WORKSPACE] Échec de l'attachement au canal ${channelName}:`, error);
        } finally {
            operationLockRef.current = false;
        }
    };
    
    setupChannel();

    return () => {
      // Pas de cleanup direct ici, géré par le useEffect de démontage
    };
}, [classroomId, ablyReady, ablyClient, eventHandlers, cleanupAbly]);


  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0 && isMountedRef.current) {
      const scrollToBottom = () => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
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
        if (!result.success) throw new Error(result.error || 'Erreur lors de l\'envoi');
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: "Le message n'a pas pu être envoyé." });
        if (isMountedRef.current) setNewMessage(messageToSend);
      }
    });
  }, [newMessage, isSending, classroomId, toast]);

  const handleReactionClick = useCallback(async (messageId: string, emoji: string) => {
    if (!isMountedRef.current) return;
    
    const originalMessages = [...messages];
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.userId === userId && r.emoji === emoji);
        let newReactions;
        if (existingReaction) {
          newReactions = msg.reactions.filter(r => r.id !== existingReaction.id);
        } else {
          newReactions = [...msg.reactions, { id: `temp-${Date.now()}`, emoji, userId, messageId, user: { id: userId, name: 'Vous' } } as ReactionWithUser];
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    }));
    
    try {
      await toggleReaction(messageId, emoji);
    } catch (error) {
      if (isMountedRef.current) setMessages(originalMessages);
      toast({ variant: 'destructive', title: 'Erreur', description: "La réaction n'a pas pu être enregistrée." });
    }
  }, [messages, userId, toast]);

  const handleDeleteHistory = useCallback(async () => {
    try {
      await deleteChatHistory(classroomId);
      toast({ title: 'Succès', description: "L'historique du chat a été effacé." });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'effacer l'historique." });
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
    <div className="flex flex-col h-full w-full bg-card border rounded-lg">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg flex items-center gap-2"><MessageSquare /> Discussion de Classe</h3>
      </div>
      <div className="flex-grow overflow-hidden">
        <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-muted-foreground text-center">Aucun message. Soyez le premier à parler !</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderId === userId;
                const reactionSummary = getReactionSummary(msg.reactions);
                return (
                  <div key={msg.id} className={cn('flex items-end gap-2 group', isOwnMessage && 'flex-row-reverse')}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.senderId}`} alt={msg.sender.name || 'Utilisateur'} />
                      <AvatarFallback>{msg.sender.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className={cn('rounded-lg p-3 max-w-xs relative', isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="text-sm font-semibold mb-1">{isOwnMessage ? 'Vous' : msg.sender.name}</p>
                      <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.createdAt), 'HH:mm', { locale: fr })}</p>
                      <div className={cn('absolute -bottom-3 flex gap-1', isOwnMessage ? 'right-2' : 'left-2')}>
                        {Object.keys(reactionSummary).length > 0 && (
                          <div className="flex gap-1 bg-background border rounded-full px-2 py-0.5">
                            {Object.entries(reactionSummary).map(([emoji, count]) => (
                              <span key={emoji} className="text-xs">{emoji} {count}</span>
                            ))}
                          </div>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background">
                              <Smile className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-1 w-auto" align={isOwnMessage ? 'end' : 'start'}>
                            <div className="flex gap-1">
                              {EMOJIS.map(emoji => (
                                <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8 text-lg hover:scale-110 transition-transform" onClick={() => handleReactionClick(msg.id, emoji)}>{emoji}</Button>
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
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex gap-2 w-full items-center">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Écrire un message..." disabled={isSending} autoComplete="off" className="flex-1" />
          <Button type="submit" disabled={isSending || !newMessage.trim()} size="icon">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          {userRole === 'PROFESSEUR' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Vider le chat ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible et supprimera tous les messages pour tous les participants.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteHistory} className="bg-destructive hover:bg-destructive/90">Vider</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </form>
      </div>
    </div>
  );
}
