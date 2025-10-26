// src/components/session/DocumentViewer.tsx
'use client';

import Image from 'next/image';
import { Card, CardContent } from '../ui/card';
import { File } from 'lucide-react';

interface DocumentViewerProps {
    url: string | null;
}

function isImageUrl(url: string): boolean {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

function isPdfUrl(url: string): boolean {
    if (!url) return false;
    return /\.pdf$/i.test(url);
}


export function DocumentViewer({ url }: DocumentViewerProps) {
    if (!url) {
        return (
            <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed ">
                <CardContent className="text-center text-muted-foreground p-6">
                    <File className="h-10 w-10 mx-auto mb-4" />
                    <h3 className="font-semibold">Outil Document</h3>
                    <p className="text-sm">Le professeur n'a pas encore partagé de document.</p>
                </CardContent>
            </Card>
        );
    }

    if (isImageUrl(url)) {
        return (
            <div className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
                <Image
                    src={url}
                    alt="Document partagé"
                    fill
                    className="object-contain"
                />
            </div>
        );
    }
    
    // Pour les PDF, utiliser la visionneuse Google Docs pour contourner les restrictions d'intégration
    if (isPdfUrl(url)) {
        const googleDocsUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
        return (
            <iframe
                src={googleDocsUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Visionneuse de document PDF"
            />
        );
    }

    // Pour tous les autres types (ex: autres documents, liens web), utiliser un iframe standard
    return (
        <iframe
            src={url}
            className="w-full h-full border-0 rounded-lg"
            title="Document partagé"
        />
    );
}
