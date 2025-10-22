// src/components/ProgressTracker.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function ProgressTracker() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Suivi de Progression</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Les graphiques et statistiques de progression de l'élève apparaîtront ici.</p>
      </CardContent>
    </Card>
  );
}
