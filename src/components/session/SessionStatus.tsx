// src/components/session/SessionStatus.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Wifi, Users, Edit, Activity, UserCheck } from 'lucide-react';
import { User } from '@prisma/client';

interface SessionStatusProps {
  participants: User[];
  onlineIds: string[];
  webrtcConnections: number;
  whiteboardControllerId: string | null;
}

export function SessionStatus({
  participants,
  onlineIds,
  webrtcConnections,
  whiteboardControllerId,
}: SessionStatusProps) {
  const totalInvited = participants.length;
  const onlineCount = onlineIds.length;
  const controller = participants.find(p => p.id === whiteboardControllerId);

  return (
    <Card className="bg-background/80">
      <Accordion type="single" collapsible defaultValue="status">
        <AccordionItem value="status" className="border-b-0">
          <AccordionTrigger className="p-6">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-5 w-5 text-primary" />
              Statut de la Session
            </CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Participants en ligne</span>
                </div>
                <span className="font-semibold">{onlineCount} / {totalInvited}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wifi className="h-4 w-4" />
                  <span>Connexions Vidéo</span>
                </div>
                <span className="font-semibold">{webrtcConnections} / {onlineCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Edit className="h-4 w-4" />
                  <span>Contrôle Tableau</span>
                </div>
                <span className="font-semibold truncate max-w-[120px]">
                  {controller ? controller.name : 'Personne'}
                </span>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
