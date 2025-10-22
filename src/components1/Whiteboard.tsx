// src/components/Whiteboard.tsx
'use client';
import { Card, CardContent } from './ui/card';
import { Brush } from 'lucide-react';

export function Whiteboard() {
  return (
    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/50 border-dashed">
        <CardContent className="text-center text-muted-foreground">
            <Brush className="h-10 w-10 mx-auto mb-4" />
            <h3 className="font-semibold">Tableau Blanc</h3>
            <p className="text-sm">Fonctionnalité en cours de maintenance.</p>
        </CardContent>
    </Card>
  );
}
