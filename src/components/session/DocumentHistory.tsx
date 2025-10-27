// src/components/session/DocumentHistory.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { FileText, Share2, History } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DocumentInHistory } from '@/types';

interface DocumentHistoryProps {
    documents: DocumentInHistory[];
    onShare: (doc: DocumentInHistory) => void;
}

export function DocumentHistory({ documents, onShare }: DocumentHistoryProps) {
    if (!documents || documents.length === 0) {
        return null; // Ne pas afficher le composant s'il n'y a pas de documents
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
                                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <FileText className="h-5 w-5 flex-shrink-0" />
                                                    <div className='min-w-0'>
                                                        <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
                                                        <p className='text-xs text-muted-foreground'>Partagé {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" onClick={() => onShare(doc)}>
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
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
