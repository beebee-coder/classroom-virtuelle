// src/components/TeacherSessionControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ScreenShare, 
  ScreenShareOff, 
  Hand, 
  Clock, 
  Users, 
  Award,
  MessageSquare,
  Monitor,
  Zap,
  Square, // Remplacement de Whiteboard
  XCircle,
  Play,
  Pause,
  RotateCcw,
  FileText,
  Camera
} from 'lucide-react';
import { useState } from 'react';

interface TeacherSessionControlsProps {
  onScreenShare: () => void;
  isScreenSharing: boolean;
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function TeacherSessionControls({
  onScreenShare,
  isScreenSharing,
  activeTool,
  onToolChange
}: TeacherSessionControlsProps) {

  const tools = [
    { id: 'whiteboard', name: 'Tableau Blanc', icon: Square, description: 'Ouvrir le tableau blanc partagé' },
    { id: 'document', name: 'Document', icon: FileText, description: 'Partager un document' },
    { id: 'quiz', name: 'Quiz', icon: Award, description: 'Lancer un quiz interactif' },
    { id: 'camera', name: 'Camera', icon: Camera, description: 'Gérer les caméras' },
  ];

  return (
    <div className="space-y-4">
      {/* Contrôles principaux */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Contrôles de Session
          </CardTitle>
          <CardDescription>
            Gérer la session en cours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Partage d'écran */}
          <Button
            onClick={onScreenShare}
            variant={isScreenSharing ? "destructive" : "default"}
            className="w-full justify-start gap-2"
            size="lg"
          >
            {isScreenSharing ? (
              <ScreenShareOff className="h-4 w-4" />
            ) : (
              <ScreenShare className="h-4 w-4" />
            )}
            {isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
          </Button>
        </CardContent>
      </Card>

      {/* Outils d'enseignement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Outils Pédagogiques
          </CardTitle>
          <CardDescription>
            Outils interactifs pour votre cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? "default" : "outline"}
                  className="h-auto py-3 flex-col gap-2"
                  onClick={() => onToolChange(tool.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{tool.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
