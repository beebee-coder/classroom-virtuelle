// src/components/CameraManager.tsx
'use client';
import { Card, CardContent } from './ui/card';
import { Camera } from 'lucide-react';

export function CameraManager() {
  return (
    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
        <CardContent className="text-center text-muted-foreground p-6">
            <Camera className="h-10 w-10 mx-auto mb-4" />
            <h3 className="font-semibold">Gestion des Caméras</h3>
            <p className="text-sm">Cette fonctionnalité est en cours de développement.</p>
        </CardContent>
    </Card>
  );
}
