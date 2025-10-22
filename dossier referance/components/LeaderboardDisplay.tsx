// src/components/LeaderboardDisplay.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function LeaderboardDisplay() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Classement de la Classe</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Le classement des élèves sera affiché ici.</p>
      </CardContent>
    </Card>
  );
}
