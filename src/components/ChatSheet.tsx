// src/components/ChatSheet.tsx
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MessageSquare, Send, Loader2, Smile, Trash2 } from 'lucide-react';
import { getMessages, sendMessage, toggleReaction, deleteChatHistory } from '@/lib/actions/chat.actions';
import { pusherClient } from '@/lib/pusher/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import type { MessageWithReactions, ReactionWithUser, Role } from '@/lib/types';

const EMOJIS = ['👍', '❤️', '😂', '😯', '😢', '🤔'];

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMessages() {
      try {
        const initialMessages = await getMessages(classroomId);
        setMessages(initialMessages);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger les messages.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchMessages();
  }, [classroomId, toast]);

  useEffect(() => {
    if (!classroomId) return;

    const channelName = `presence-classe-${classroomId}`;
    pusherClient.subscribe(channelName);

    const handleNewMessage = (data: MessageWithReactions) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleReaction = (data: { messageId: string, reaction: ReactionWithUser, action: 'added' | 'removed' }) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id === data.messageId) {
          let newReactions = [...msg.reactions];
          if (data.action === 'added') {
            // Éviter les doublons de réaction par utilisateur
            const existingIndex = newReactions.findIndex((r: ReactionWithUser) => r.emoji === data.reaction.emoji && r.userId === data.reaction.userId);
            if (existingIndex === -1) {
              newReactions.push(data.reaction);
            }
          } else {
            newReactions = newReactions.filter((r: ReactionWithUser) => !(r.id === data.reaction.id || (r.emoji === data.reaction.emoji && r.userId === data.reaction.userId)));
          }
          return { ...msg, reactions: newReactions };
        }
        return msg;
      }));
    };
    
    const handleHistoryCleared = () => {
        setMessages([]);
        toast({ title: "Historique effacé", description: "Le professeur a effacé l'historique de la conversation." });
    };

    pusherClient.bind('new-message', handleNewMessage);
    pusherClient.bind('reaction-update', handleReaction);
    pusherClient.bind('history-cleared', handleHistoryCleared);

    return () => {
      pusherClient.unsubscribe(channelName);
      pusherClient.unbind('new-message', handleNewMessage);
      pusherClient.unbind('reaction-update', handleReaction);
      pusherClient.unbind('history-cleared', handleHistoryCleared);
    };
  }, [classroomId, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const form = new FormData();
    form.append('message', newMessage);
    form.append('classroomId', classroomId);

    setNewMessage('');
    startSending(async () => {
      try {
        await sendMessage(form);
      } catch {
        toast({ variant: 'destructive', title: 'Erreur', description: "Le message n'a pas pu être envoyé." });
        setNewMessage(newMessage); // Restaurer le message en cas d'échec
      }
    });
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const existingReaction = msg.reactions.find((r: ReactionWithUser) => r.userId === userId && r.emoji === emoji);
            let newReactions;
            if (existingReaction) {
                newReactions = msg.reactions.filter((r: ReactionWithUser) => r.id !== existingReaction.id);
            } else {
                newReactions = [...msg.reactions, { id: `temp-${Date.now()}`, emoji, userId, messageId, user: { id: userId, name: 'Vous' } } as ReactionWithUser];
            }
            return { ...msg, reactions: newReactions };
        }
        return msg;
    }));
    
    toggleReaction(messageId, emoji).catch(() => {
        toast({ variant: 'destructive', title: 'Erreur', description: "La réaction n'a pas pu être enregistrée." });
        // Revert optimistic update might be complex, so we rely on server broadcast to correct it
    });
  };

  const handleDeleteHistory = async () => {
      try {
          await deleteChatHistory(classroomId);
          toast({ title: 'Succès', description: "L'historique du chat a été effacé." });
      } catch {
           toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'effacer l'historique." });
      }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <MessageSquare />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full w-full sm:max-w-lg p-0">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Discussion de Classe</SheetTitle>
          <SheetDescription>Échangez avec votre professeur et vos camarades.</SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full px-6" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-muted-foreground">Aucun message pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn('flex items-end gap-2 group', msg.senderId === userId && 'flex-row-reverse')}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${msg.senderId}`} />
                      <AvatarFallback>{msg.sender.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className={cn('rounded-lg p-3 max-w-xs relative', msg.senderId === userId ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <p className="text-sm font-bold mb-1">{msg.sender.name}</p>
                      <p className="text-sm break-words">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.createdAt), 'HH:mm')}</p>
                       <div className="absolute -bottom-3 flex gap-1">
                         {msg.reactions.length > 0 && (
                            <div className="flex gap-1 bg-background border rounded-full px-2 py-0.5">
                            {Object.entries(msg.reactions.reduce((acc: Record<string, number>, r: ReactionWithUser) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})).map(([emoji, count]) => (
                                <span key={emoji} className="text-xs">{emoji} {count as number}</span>
                            ))}
                            </div>
                        )}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Smile className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-1 w-auto">
                                <div className="flex gap-1">
                                {EMOJIS.map(emoji => (
                                    <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReactionClick(msg.id, emoji)}>
                                        {emoji}
                                    </Button>
                                ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <SheetFooter className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex gap-2 w-full">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              disabled={isSending}
              autoComplete="off"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
                            <AlertDialogAction onClick={handleDeleteHistory} className="bg-destructive hover:bg-destructive/90">
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
