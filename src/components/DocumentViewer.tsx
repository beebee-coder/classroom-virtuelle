// src/components/DocumentViewer.tsx
'use client';
import { Card, CardContent } from './ui/card';
import { FileText, UploadCloud } from 'lucide-react';
import Image from 'next/image';

interface DocumentViewerProps {
  url?: string | null;
}

// Fonction pour détecter si l'URL est une image
const isImageUrl = (url: string): boolean => {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url);
}

export function DocumentViewer({ url }: DocumentViewerProps) {
  if (!url) {
    return (
      <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed my-4 ">
        <CardContent className="text-center text-muted-foreground p-6">
          <UploadCloud className="h-10 w-10 mx-auto mb-4" />
          <h3 className="font-semibold">Visionneuse de Documents</h3>
          <p className="text-sm">Le professeur n'a pas encore partagé de document.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full overflow-hidden relative">
      {isImageUrl(url) ? (
        <Image
          src={url}
          alt="Document partagé"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain" // 'object-contain' pour voir toute l'image, 'object-cover' pour remplir
        />
      ) : (
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Document Viewer"
          allow="fullscreen"
        />
      )}
    </Card>
  );
}