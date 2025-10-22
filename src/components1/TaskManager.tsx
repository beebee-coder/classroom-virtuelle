// src/components/TaskManager.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function TaskManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionnaire de Tâches</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">La liste des tâches quotidiennes, hebdomadaires et mensuelles apparaîtra ici.</p>
      </CardContent>
    </Card>
  );
}
