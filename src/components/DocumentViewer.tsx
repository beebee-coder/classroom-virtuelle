// src/components/DocumentViewer.tsx
'use client';
import { Card, CardContent } from './ui/card';
import { FileText } from 'lucide-react';

export function DocumentViewer() {
  return (
    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
        <CardContent className="text-center text-muted-foreground p-6">
            <FileText className="h-10 w-10 mx-auto mb-4" />
            <h3 className="font-semibold">Visionneuse de Documents</h3>
            <p className="text-sm">Cette fonctionnalité est en cours de développement.</p>
        </CardContent>
    </Card>
  );
}
