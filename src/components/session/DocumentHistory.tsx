// src/components/session/DocumentHistory.tsx
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

interface DocumentHistoryProps {
    documents: DocumentInHistory[];
    onSelectDocument: (doc: DocumentInHistory) => void;
    onReshare: (doc: DocumentInHistory) => void;
    sessionId: string;
}

function FormattedDate({ dateString }: { dateString: string }) {
  const [formattedDate, setFormattedDate] = useState('...');

  useEffect(() => {
    try {
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


export function DocumentHistory({ documents, onSelectDocument, onReshare, sessionId }: DocumentHistoryProps) {
    const { toast } = useToast();
    const [isDeleting, startDeleteTransition] = useTransition();

    const handleDelete = (docId: string) => {
        startDeleteTransition(async () => {
            try {
                await deleteSharedDocument(docId, sessionId);
                toast({ title: "Document supprimé", description: "Le document a été retiré de l'historique." });
            } catch (error) {
                toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer le document." });
            }
        });
    }

    if (!documents || documents.length === 0) {
        return null; 
    }
    
    return (
        <Card className="bg-background/80">
            <Accordion type="single" collapsible defaultValue="docHistory">
                <AccordionItem value="docHistory" className="border-b-0">
                    <AccordionTrigger className="p-6">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <History className="h-5 w-5 text-primary" />
                            Historique des Documents
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent className="pt-0">
                            {documents.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center">Aucun document n'a encore été partagé.</p>
                            ) : (
                                <ScrollArea className="h-48">
                                    <div className="space-y-2 pr-4">
                                        {documents.map((doc, index) => (
                                            <div key={doc.id || index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="h-5 w-5 flex-shrink-0" />
                                                    <div className='min-w-0'>
                                                        <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
                                                        <p className='text-xs text-muted-foreground'>Partagé <FormattedDate dateString={doc.createdAt} /></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <Button size="icon" variant="ghost" onClick={() => onSelectDocument(doc)} aria-label="Afficher">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => onReshare(doc)} aria-label="Repartager">
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" disabled={isDeleting} aria-label="Supprimer">
                                                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
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
                                                                <AlertDialogAction onClick={() => handleDelete(doc.id!)} className="bg-destructive hover:bg-destructive/90">
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
                            )}
                        </CardContent>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
    );
}
