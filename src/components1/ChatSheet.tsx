

//src/components/chatSheet.tsx
"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { MessageCircle, Send, SmilePlus, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { EmojiPicker } from './EmojiPicker';
import { getMessages, sendMessage, toggleReaction, deleteChatHistory } from '@/lib/actions/chat.actions';
import { MessageWithReactions, ReactionWithUser } from '@/lib/types';
import { useFormStatus } from 'react-dom';
import { pusherClient } from '@/lib/pusher/client';
import { useToast } from '@/hooks/use-toast';
import { useSession } from 'next-auth/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { OnlineUsers } from './OnlineUsers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Role } from '@prisma/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import type { Message as PrismaMessage } from '@prisma/client';

type MessageWithStatus = PrismaMessage & {
    reactions: ReactionWithUser[];
    status?: 'pending' | 'failed';
    directMessageSenderId?: string | null; // ← Ajouter cette ligne

};

function Message({ msg, currentUserId, onReaction, onResend }: { msg: MessageWithStatus, currentUserId: string, onReaction: (emoji: string) => void, onResend: () => void }) {
    const isCurrentUser = msg.senderId === currentUserId;
    const reactionsByEmoji: { [key: string]: { users: {id: string, name: string | null}[] } } = {};
    
    msg.reactions.forEach(r => {
        if (!reactionsByEmoji[r.emoji]) {
            reactionsByEmoji[r.emoji] = { users: [] };
        }
        reactionsByEmoji[r.emoji].users.push({ id: r.userId, name: r.user.name });
    });

    const reactionEntries = Object.entries(reactionsByEmoji);
    const messageTime = msg.status === 'pending' ? <Clock className="h-3 w-3" /> : format(new Date(msg.createdAt), 'p');

    return (
        <div className={cn("group relative", msg.status && "opacity-80")}>
            <div className={cn("flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
                {!isCurrentUser && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col gap-1 max-w-xs sm:max-w-sm">
                    <div className={cn("rounded-lg p-3 text-sm relative", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {!isCurrentUser && <p className="font-bold">{msg.senderName}</p>}
                        <p className="mt-1 whitespace-pre-wrap">{msg.message}</p>
                        <p className={cn("mt-2 text-xs opacity-60", isCurrentUser ? 'text-right' : 'text-left')}>{messageTime}</p>
                    </div>
                     {reactionEntries.length > 0 && (
                        <div className={cn("flex gap-1 flex-wrap", isCurrentUser ? 'justify-end' : 'justify-start')}>
                            {reactionEntries.map(([emoji, { users }]) => (
                               <TooltipProvider key={emoji} delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div onClick={() => onReaction(emoji)}>
                                             <ReactionBubble emoji={emoji} count={users.length} hasReacted={users.some(u => u.id === currentUserId)} />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{users.map(u => u.name).join(', ')}</p>
                                    </TooltipContent>
                                </Tooltip>
                               </TooltipProvider>
                            ))}
                        </div>
                    )}
                </div>
                {isCurrentUser && (
                     <Avatar className="h-8 w-8">
                        <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
            {msg.status === 'failed' && (
                 <div className={cn("absolute top-0 flex items-center gap-2", isCurrentUser ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2")}>
                     <AlertCircle className="h-4 w-4 text-destructive" />
                     <Button variant="link" size="sm" className="text-destructive p-0" onClick={onResend}>
                         Renvoyer
                     </Button>
                 </div>
             )}
             <Popover>
                <PopoverTrigger asChild>
                     <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "absolute top-0 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
                             isCurrentUser ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
                        )}
                    >
                        <SmilePlus className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-0">
                    <EmojiPicker onEmojiSelect={onReaction} />
                </PopoverContent>
            </Popover>
        </div>
    )
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" aria-label="Send message" disabled={pending}>
          <Send className="h-4 w-4" />
        </Button>
    )
}


export function ChatSheet({ classroomId, userId, userRole }: { classroomId: string, userId: string, userRole: Role }) {
  const [messages, setMessages] = useState<MessageWithStatus[]>([]);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { toast } = useToast();

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('div');
        if(viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior });
        }
    }, 100);
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    
    const fetchMessages = () => {
      startTransition(async () => {
        try {
          const res = await getMessages(classroomId);
          setMessages(res || []);
          scrollToBottom('auto');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de charger les messages.'
            })
        }
      });
    };
    fetchMessages();
  }, [classroomId, toast, scrollToBottom]);
  
  const handleNewMessage = useCallback((newMessage: MessageWithReactions) => {
    setMessages(prev => {
        const tempMessageIndex = prev.findIndex(msg => msg.status === 'pending' && msg.id.startsWith('temp-') && msg.message === newMessage.message);

        let newMessages;
        if (tempMessageIndex !== -1) {
            newMessages = [...prev];
            newMessages[tempMessageIndex] = newMessage;
        } else if (!prev.some(msg => msg.id === newMessage.id)) {
            newMessages = [...prev, newMessage];
        } else {
            return prev; 
        }
        
        return newMessages;
    });
    scrollToBottom();
}, [scrollToBottom]);


  const handleReactionUpdate = useCallback((data: { messageId: string, reaction: ReactionWithUser, action: 'added' | 'removed' }) => {
    setMessages(prev => 
        prev.map(msg => {
            if (msg.id === data.messageId) {
                let newReactions = [...msg.reactions];
                if (data.action === 'added') {
                    if (!newReactions.some(r => r.id === data.reaction.id)) {
                        newReactions.push(data.reaction);
                    }
                } else {
                    newReactions = newReactions.filter(r => r.id !== data.reaction.id);
                }
                return { ...msg, reactions: newReactions };
            }
            return msg;
        })
    );
  }, []);

  const handleHistoryCleared = useCallback(() => {
    setMessages([]);
    toast({
      title: "Historique effacé",
      description: "Le professeur a supprimé l'historique du chat.",
    });
  }, [toast]);


  useEffect(() => {
    if (!classroomId) return;

    const channelName = `presence-classe-${classroomId}`;
    try {
        const channel = pusherClient.subscribe(channelName);
        
        channel.bind('pusher:subscription_succeeded', () => {});
        channel.bind('pusher:subscription_error', (status: any) => {
            console.error(`💥 [Pusher] Erreur de souscription:`, status);
        });

        channel.bind('new-message', handleNewMessage);
        channel.bind('reaction-update', handleReactionUpdate);
        channel.bind('history-cleared', handleHistoryCleared);
        
        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe(channelName);
        };
    } catch (error) {
        console.error("💥 [Pusher] La souscription a échoué:", error);
        toast({
            variant: "destructive",
            title: "Erreur de connexion",
            description: "Impossible de se connecter au chat en temps réel."
        });
    }

  }, [classroomId, handleNewMessage, handleReactionUpdate, handleHistoryCleared, toast]);

  const handleReaction = (messageId: string, emoji: string) => {
    if (messageId.startsWith('temp-')) {
        toast({
            variant: 'destructive',
            title: 'Veuillez patienter',
            description: 'Impossible de réagir à un message en cours d\'envoi.'
        });
        return;
    }
    startTransition(async () => {
        try {
           await toggleReaction(messageId, emoji);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible d\'ajouter la réaction.'
            })
        }
    });
  };
  
 const sendMessageAction = (formData: FormData) => {
    const messageContent = formData.get('message') as string;
    if (!messageContent.trim() || !session?.user) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage: MessageWithStatus = {
        id: tempId,
        message: messageContent,
        senderId: session.user.id,
        senderName: session.user.name ?? 'User',
        classroomId: classroomId,
        createdAt: new Date(),
        reactions: [],
        status: 'pending',
        isQuestion: null,
        conversationId: null,
        directMessageSenderId: null,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();
    formRef.current?.reset();
    
    sendMessage(formData).catch((error) => {
      console.error("💥 Échec de l'envoi du message:", error);
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg));
      toast({
          variant: "destructive",
          title: "Erreur d'envoi",
          description: "Votre message n'a pas pu être envoyé."
      });
    });
  };

  const resendMessageAction = async (msg: MessageWithStatus) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'pending' } : m));
    
    const formData = new FormData();
    formData.append('message', msg.message);
    formData.append('classroomId', msg.classroomId!);

    sendMessage(formData).catch((error) => {
        console.error("💥 Échec de la nouvelle tentative d'envoi:", error);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
        toast({
           variant: "destructive",
           title: "Erreur d'envoi",
           description: "Votre message n'a pas pu être renvoyé."
       });
    });
  }

  
  const descriptionText = userRole === Role.PROFESSEUR 
    ? "Discussion en temps réel avec vos élèves."
    : "Discussion en temps réel avec votre classe.";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>
          <MessageCircle className="mr-2 h-4 w-4" /> Ouvrir le Chat
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col h-full w-full sm:max-w-lg" data-radix-sheet-content>
        <SheetHeader>
          <div className="flex justify-between items-center">
            <div>
              <SheetTitle>Chat de la classe</SheetTitle>
              <SheetDescription>{descriptionText}</SheetDescription>
            </div>
            {userRole === Role.PROFESSEUR && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Supprimer l'historique</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. L'historique complet de cette discussion sera définitivement supprimé.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <form action={deleteChatHistory.bind(null, classroomId)}>
                        <AlertDialogAction asChild>
                            <Button type="submit">Supprimer</Button>
                        </AlertDialogAction>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 flex flex-col min-h-0">
          {classroomId && <OnlineUsers channelType='classe' channelId={classroomId} />}
          <ScrollArea className="flex-1 pr-4 -mr-4 mt-4" ref={scrollAreaRef}>
            <div className="space-y-6 py-4">
              {messages.map((msg) => (
                <Message 
                    key={msg.id} 
                    msg={msg} 
                    currentUserId={userId} 
                    onReaction={(emoji) => handleReaction(msg.id, emoji)}
                    onResend={() => resendMessageAction(msg)}
                />
              ))}
               {messages.length === 0 && !isPending && (
                <div className="text-center text-muted-foreground mt-8">
                    Aucun message pour le moment.
                </div>
              )}
            </div>
          </ScrollArea>
          <form 
            ref={formRef}
            action={sendMessageAction}
            className="flex gap-2 border-t pt-4"
          >
            <input type="hidden" name="classroomId" value={classroomId} />
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

function ReactionBubble({ emoji, count, hasReacted }: { emoji: string, count: number, hasReacted: boolean }) {
    return (
        <div className={cn(
            "rounded-full px-2 py-0.5 text-xs flex items-center gap-1 cursor-pointer",
            hasReacted ? "bg-primary/20 border border-primary" : "bg-muted border"
        )}>
            <span>{emoji}</span>
            <span>{count}</span>
        </div>
    )
}
    
    
    

    
