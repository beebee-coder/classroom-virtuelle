// src/components/TeacherSessionControls.tsx - Version corrigée
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
  raisedHands: string[];
  onLowerHand: (userId: string) => void;
}

export function TeacherSessionControls({
  onScreenShare,
  isScreenSharing,
  raisedHands,
  onLowerHand,
}: TeacherSessionControlsProps) {
  const [activeTool, setActiveTool] = useState<string>('');

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

      {/* Mains levées */}
      {raisedHands.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hand className="h-5 w-5 text-orange-500" />
              Mains Levées
              <span className="bg-orange-500 text-white rounded-full px-2 py-1 text-xs">
                {raisedHands.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {raisedHands.map((userId, index) => (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Hand className="h-4 w-4 text-orange-500 animate-bounce" />
                      <span className="text-sm font-medium">
                        Élève {index + 1}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLowerHand(userId)}
                      className="h-7 text-xs"
                    >
                      Baisser
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
                  onClick={() => setActiveTool(tool.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{tool.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Aperçu de la Classe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">75%</div>
              <div className="text-xs text-muted-foreground">Compréhension</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">{raisedHands.length}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">45min</div>
              <div className="text-xs text-muted-foreground">Durée</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
