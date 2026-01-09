// src/components/session/DocumentHistory.tsx - VERSION CORRIGÉE POUR ABLY V2+
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FileText, Share2, History, Trash2, Loader2, Eye, MoreVertical } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentInHistory } from '@/types';
import { useEffect, useState, useTransition, useCallback, useMemo } from 'react';
import { deleteSharedDocument } from '@/lib/actions/session.actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAbly } from '@/hooks/useAbly';
import { AblyEvents } from '@/lib/ably/events';
import { getSessionChannelName } from '@/lib/ably/channels';
import type { Message } from 'ably'; // ✅ CORRECTION : import direct
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface DocumentHistoryProps {
    documents: DocumentInHistory[];
    onSelectDocument: (doc: DocumentInHistory) => void;
    onReshare: (doc: DocumentInHistory) => void;
    sessionId: string;
    currentUserId: string;
}

export function DocumentHistory({ documents, onSelectDocument, onReshare, sessionId, currentUserId }: DocumentHistoryProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [localDocuments, setLocalDocuments] = useState<DocumentInHistory[]>([]);
    const { client: ablyClient } = useAbly();

    useEffect(() => {
        setLocalDocuments(documents || []);
    }, [documents]);

    useEffect(() => {
        if (!ablyClient || !sessionId) return;

        const channelName = getSessionChannelName(sessionId);
        const channel = ablyClient.channels.get(channelName);
        
        const handleDocumentDeleted = (message: Message) => { // ✅ CORRECTION : typage direct
            const { documentId, deletedBy } = message.data;
            if (deletedBy !== currentUserId) {
                setLocalDocuments(prev => prev.filter(doc => doc.id !== documentId));
                toast({
                    title: 'Document supprimé',
                    description: 'Un document a été retiré de l\'historique',
                    variant: 'default'
                });
            }
        };

        channel.subscribe(AblyEvents.DOCUMENT_DELETED, handleDocumentDeleted);

        return () => {
            channel.unsubscribe(AblyEvents.DOCUMENT_DELETED, handleDocumentDeleted);
        };
    }, [ablyClient, sessionId, currentUserId, toast]);

    const handleDelete = useCallback((docId: string) => {
        if (!docId || docId === 'undefined' || isDeleting) return;

        const documentToDelete = localDocuments.find(doc => doc.id === docId);
        setLocalDocuments(prev => prev.filter(doc => doc.id !== docId));

        startDeleteTransition(async () => {
            try {
                await deleteSharedDocument(docId, sessionId, currentUserId);
                toast({ 
                    title: "Document supprimé", 
                    description: "Le document a été retiré de l'historique." 
                });
            } catch (error) {
                if (documentToDelete) {
                    setLocalDocuments(prev => [...prev, documentToDelete].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }
                toast({ 
                    variant: 'destructive', 
                    title: "Erreur", 
                    description: error instanceof Error ? error.message : "Impossible de supprimer le document." 
                });
            }
        });
    }, [isDeleting, localDocuments, sessionId, currentUserId, toast]);

    const handleReshare = (doc: DocumentInHistory) => {
        onReshare(doc);
        toast({
            title: 'Document repartagé',
            description: 'Le document a été repartagé avec les participants',
            variant: 'default'
        });
    };

    const validDocuments = useMemo(() => localDocuments.filter(doc => 
        doc && doc.id && doc.id !== 'undefined' && doc.name && doc.createdAt
    ), [localDocuments]);

    const formatDate = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
        } catch {
            return "date invalide";
        }
    };

    if (validDocuments.length === 0) {
        return (
            <Card className="bg-background/80 w-full">
                <Accordion type="single" collapsible defaultValue="docHistory">
                    <AccordionItem value="docHistory" className="border-b-0">
                        <AccordionTrigger className="p-4 md:p-6">
                            <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                                <History className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                                Historique des Documents
                                <span className="text-xs md:text-sm text-muted-foreground ml-2">(0)</span>
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="pt-0 px-4 md:px-6">
                                <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                                    Aucun document n'a encore été partagé.
                                </p>
                            </CardContent>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>
        );
    }
    
    return (
        <Card className="bg-background/100 w-full">
            <Accordion type="single" collapsible defaultValue="docHistory">
                <AccordionItem value="docHistory" className="border-b-0">
                    <AccordionTrigger className="p-4 md:p-6 hover:no-underline">
                        <CardTitle className="flex items-center gap-2 text-sm md:text-base font-semibold">
                            <History className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            <span className="truncate">Historique</span>
                            <span className="text-xs md:text-sm text-muted-foreground ml-2 flex-shrink-0">
                                ({validDocuments.length})
                            </span>
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent><CardContent className="pt-0 px-4 md:px-6">
    <ScrollArea className="h-48 md:h-56">
        <div className="space-y-2 pr-2 md:pr-4">
            {validDocuments.map((doc: DocumentInHistory) => (
                <div 
                    key={doc.id} 
                    className="flex flex-col p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors gap-3"
                >
                    {/* Section supérieure : Contenu du document */}
                    <div className="flex items-start gap-3 w-full min-w-0">
                        <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />
                        <div className="min-w-0 flex-1">
                            {/* Nom du document avec rupture de ligne */}
                            <p className="text-sm font-medium break-words leading-relaxed" title={doc.name}>
                                {doc.name}
                            </p>
                            {/* Métadonnées avec rupture de ligne */}
                            <p className="text-xs text-muted-foreground break-words leading-relaxed mt-1">
                                Partagé {formatDate(doc.createdAt)}
                                {doc.sharedBy && ` par ${doc.sharedBy}`}
                            </p>
                        </div>
                    </div>

                    {/* Section inférieure : Actions - s'aligne en bas quand nécessaire */}
                    <div className="flex items-center justify-between gap-2 w-full">
                        {/* Actions principales - visibles sur desktop */}
                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0 ml-auto">
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => onSelectDocument(doc)} 
                                aria-label="Afficher" 
                                className="h-8 w-8"
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={() => handleReshare(doc)} 
                                aria-label="Repartager" 
                                className="h-8 w-8"
                            >
                                <Share2 className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                        disabled={isDeleting} 
                                        aria-label="Supprimer"
                                    >
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-[95vw] rounded-lg md:max-w-md">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl">Supprimer le document ?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base">
                                            Cette action est irréversible.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel className="mt-0 sm:mt-0 flex-1">
                                            Annuler
                                        </AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={() => handleDelete(doc.id)} 
                                            className="bg-destructive hover:bg-destructive/90 flex-1"
                                        >
                                            Supprimer
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        {/* Menu déroulant pour mobile */}
                        <div className="sm:hidden flex-shrink-0 ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => onSelectDocument(doc)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Afficher
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReshare(doc)}>
                                        <Share2 className="h-4 w-4 mr-2" />
                                        Repartager
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem 
                                                className="text-destructive focus:text-destructive" 
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Supprimer
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-[95vw] rounded-lg">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-lg">
                                                    Supprimer le document ?
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Cette action est irréversible.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="flex flex-col gap-2">
                                                <AlertDialogCancel className="mt-0 flex-1">
                                                    Annuler
                                                </AlertDialogCancel>
                                                <AlertDialogAction 
                                                    onClick={() => handleDelete(doc.id)} 
                                                    className="bg-destructive hover:bg-destructive/90 flex-1"
                                                >
                                                    Supprimer
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </ScrollArea>
</CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}