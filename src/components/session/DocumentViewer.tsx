// src/components/session/DocumentViewer.tsx - VERSION SIMPLIFIÉE
'use client';

import Image from 'next/image';
import { Card, CardContent } from '../ui/card';
import { File, Download } from 'lucide-react';

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
    const handleOpenPDF = () => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleDownloadPDF = () => {
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    if (!url) {
        return (
            <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
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
    
    // Pour les PDF, version simplifiée sans Button
    if (isPdfUrl(url)) {
        return (
            <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
                    <span className="text-sm font-medium">Document PDF</span>
                    <button 
                        onClick={handleDownloadPDF}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-muted/30">
                    <div className="text-center p-6">
                        <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold text-lg mb-2">Document PDF partagé</h3>
                        <p className="text-muted-foreground mb-4">
                            Ce document a été partagé par le professeur.
                        </p>
                        <div className="space-x-2">
                            <button 
                                onClick={handleOpenPDF}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Ouvrir le PDF
                            </button>
                            <button 
                                onClick={handleDownloadPDF}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            >
                                Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Pour tous les autres types
    return (
        <iframe
            src={url}
            className="w-full h-full border-0 rounded-lg"
            title="Document partagé"
        />
    );
}
