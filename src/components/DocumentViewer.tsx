// src/components/DocumentViewer.tsx
'use client';
import { Card, CardContent } from './ui/card';
import { FileText, UploadCloud } from 'lucide-react';

interface DocumentViewerProps {
  url?: string | null;
}

export function DocumentViewer({ url }: DocumentViewerProps) {
  if (!url) {
    return (
      <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
        <CardContent className="text-center text-muted-foreground p-6">
          <UploadCloud className="h-10 w-10 mx-auto mb-4" />
          <h3 className="font-semibold">Visionneuse de Documents</h3>
          <p className="text-sm">Le professeur n'a pas encore partagé de document.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full overflow-hidden">
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Document Viewer"
        allow="fullscreen"
      />
    </Card>
  );
}
