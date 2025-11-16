// src/components/session/DocumentHistory.tsx - VERSION CORRIGÉE AVEC HISTORIQUE VISIBLE
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FileText, Share2, History, Trash2, Loader2, Eye } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentInHistory } from '@/types';
import { useEffect, useState, useTransition } from 'react';
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
import type { Types } from 'ably';

interface DocumentHistoryProps {
    documents: DocumentInHistory[];
    onSelectDocument: (doc: DocumentInHistory) => void;
    onReshare: (doc: DocumentInHistory) => void;
    sessionId: string;
    currentUserId: string;
}

function FormattedDate({ dateString }: { dateString: string }) {
  const [formattedDate, setFormattedDate] = useState('...');

  useEffect(() => {
    try {
      if (!dateString || dateString === 'undefined') {
        throw new Error('Date string is undefined or invalid');
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      setFormattedDate(formatDistanceToNow(date, { addSuffix: true, locale: fr }));
    } catch (e) {
      console.error("Date formatting failed for:", dateString, e);
      setFormattedDate("date invalide");
    }
  }, [dateString]);

  return <>{formattedDate}</>;
}

export function DocumentHistory({ documents, onSelectDocument, onReshare, sessionId, currentUserId }: DocumentHistoryProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [localDocuments, setLocalDocuments] = useState<DocumentInHistory[]>([]);
    const { client: ablyClient } = useAbly();

    // ✅ CORRECTION : Initialiser correctement les documents locaux
    useEffect(() => {
        console.log(`📄 [DOCUMENT HISTORY] - Initializing with ${documents.length} documents`);
        setLocalDocuments(documents || []);
    }, [documents]);

    // ✅ CORRECTION SIMPLIFIÉE : Écouter seulement les suppressions
    useEffect(() => {
        if (!ablyClient || !sessionId) return;

        const channelName = getSessionChannelName(sessionId);
        const channel = ablyClient.channels.get(channelName);
        
        const handleDocumentDeleted = (message: Types.Message) => {
            const { documentId, deletedBy } = message.data;
            console.log(`📄 [DOCUMENT DELETE EVENT] - Document ${documentId} deleted by ${deletedBy}`);
            
            // ✅ Mettre à jour l'état local pour la suppression
            setLocalDocuments(prev => prev.filter(doc => doc.id !== documentId));
            
            // Notification seulement si ce n'est pas notre propre suppression
            if (deletedBy !== currentUserId) {
                toast({
                    title: 'Document supprimé',
                    description: 'Un document a été retiré de l\'historique',
                    variant: 'default'
                });
            }
        };

        console.log('🔔 [DOCUMENT HISTORY] - Subscribing to DELETE events only');
        channel.subscribe(AblyEvents.DOCUMENT_DELETED, handleDocumentDeleted);

        return () => {
            console.log('🔕 [DOCUMENT HISTORY] - Unsubscribing from document events');
            channel.unsubscribe(AblyEvents.DOCUMENT_DELETED, handleDocumentDeleted);
        };
    }, [ablyClient, sessionId, currentUserId, toast]);

    // ✅ CORRECTION : Fonction handleDelete avec mise à jour optimiste
    const handleDelete = (docId: string) => {
        if (!docId || docId === 'undefined') {
            toast({ 
                variant: 'destructive', 
                title: "Erreur", 
                description: "ID de document invalide. Impossible de supprimer." 
            });
            return;
        }

        const documentToDelete = localDocuments.find(doc => doc.id === docId);
        
        // ✅ MISE À JOUR OPTIMISTE : Supprimer immédiatement de l'UI
        setLocalDocuments(prev => prev.filter(doc => doc.id !== docId));

        startDeleteTransition(async () => {
            try {
                await deleteSharedDocument(docId, currentUserId);
                console.log(`✅ [DOCUMENT DELETE] - Document ${docId} deleted successfully`);
                
                toast({ 
                    title: "Document supprimé", 
                    description: "Le document a été retiré de l'historique." 
                });
                
            } catch (error) {
                console.error('❌ [DOCUMENT DELETE] - Error deleting document:', error);
                
                // ✅ REVERT : Remettre le document si erreur
                if (documentToDelete) {
                    setLocalDocuments(prev => [...prev, documentToDelete]);
                }
                
                toast({ 
                    variant: 'destructive', 
                    title: "Erreur", 
                    description: error instanceof Error ? error.message : "Impossible de supprimer le document." 
                });
            }
        });
    }

    // ✅ CORRECTION : Fonction reshare
    const handleReshare = (doc: DocumentInHistory) => {
        console.log(`🔄 [DOCUMENT RESHARE] - Resharing document: ${doc.id}`);
        onReshare(doc);
        
        toast({
            title: 'Document repartagé',
            description: 'Le document a été repartagé avec les participants',
            variant: 'default'
        });
    }

    // ✅ CORRECTION : Filtrage robuste des documents
    const validDocuments = localDocuments.filter(doc => 
        doc && 
        doc.id && 
        doc.id !== 'undefined' && 
        doc.name && 
        doc.createdAt
    );

    // ✅ CORRECTION : Afficher même si vide, mais avec message
    if (validDocuments.length === 0) {
        return (
            <Card className="bg-background/80">
                <Accordion type="single" collapsible defaultValue="docHistory">
                    <AccordionItem value="docHistory" className="border-b-0">
                        <AccordionTrigger className="p-6">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <History className="h-5 w-5 text-primary" />
                                Historique des Documents
                                <span className="text-sm text-muted-foreground ml-2">
                                    (0)
                                </span>
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="pt-0">
                                <p className="text-sm text-muted-foreground text-center py-4">
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
        <Card className="bg-background/80">
            <Accordion type="single" collapsible defaultValue="docHistory">
                <AccordionItem value="docHistory" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <History className="h-5 w-5 text-primary" />
                            Historique des Documents
                            <span className="text-sm text-muted-foreground ml-2">
                                ({validDocuments.length})
                            </span>
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="pt-0">
                            <ScrollArea className="h-48">
                                <div className="space-y-2 pr-4">
                                    {validDocuments.map((doc, index) => (
                                        <div 
                                            key={doc.id || `doc-${index}`} 
                                            className="flex items-center justify-between p-2 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <FileText className="h-5 w-5 flex-shrink-0" />
                                                <div className='min-w-0 flex-1'>
                                                    <p className="text-sm font-medium truncate" title={doc.name}>
                                                        {doc.name || 'Document sans nom'}
                                                    </p>
                                                    <p className='text-xs text-muted-foreground'>
                                                        Partagé <FormattedDate dateString={doc.createdAt} />
                                                        {doc.sharedBy && ` par ${doc.sharedBy}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
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
                                                            {isDeleting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin"/>
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Cette action est irréversible. Le document sera définitivement retiré de l'historique de cette session.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleDelete(doc.id!)} 
                                                                className="bg-destructive hover:bg-destructive/90"
                                                            >
                                                                Supprimer
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
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