// src/components/SessionInvitationCard.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Check, X } from "lucide-react";

interface SessionInvitationCardProps {
  professeurId: string;
  onAccept: () => void;
  onDecline: () => void;
}

// Donnée factice pour le nom du professeur
const DUMMY_TEACHER_NAME = "Professeur Test";

export function SessionInvitationCard({ professeurId, onAccept, onDecline }: SessionInvitationCardProps) {
  return (
    <Card className="mb-8 border-primary ring-2 ring-primary/50 shadow-lg animate-pulse">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-primary">
          <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${professeurId}`} />
          <AvatarFallback>{DUMMY_TEACHER_NAME.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Video className="text-primary" />
            Invitation à une session
          </CardTitle>
          <CardDescription>
            {DUMMY_TEACHER_NAME} vous invite à rejoindre une session vidéo en direct.
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDecline}>
          <X className="mr-2 h-4 w-4" />
          Refuser
        </Button>
        <Button onClick={onAccept}>
          <Check className="mr-2 h-4 w-4" />
          Accepter
        </Button>
      </CardFooter>
    </Card>
  );
}
