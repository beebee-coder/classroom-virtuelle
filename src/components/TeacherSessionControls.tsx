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
  RotateCcw
} from 'lucide-react';
import { useState } from 'react';

interface TeacherSessionControlsProps {
  onScreenShare: () => void;
  isScreenSharing: boolean;
  raisedHands: string[];
  onLowerHand: (userId: string) => void;
  onStartTimer?: () => void;
  onPauseTimer?: () => void;
  onResetTimer?: () => void;
  timerValue?: string;
  onEndSession: () => void;
}

export function TeacherSessionControls({
  onScreenShare,
  isScreenSharing,
  raisedHands,
  onLowerHand,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  timerValue = '00:00',
  onEndSession,
}: TeacherSessionControlsProps) {
  const [activeTool, setActiveTool] = useState<string>('');

  const tools = [
    { id: 'whiteboard', name: 'Tableau Blanc', icon: Square, description: 'Ouvrir le tableau blanc partagé' },
    { id: 'poll', name: 'Sondage', icon: MessageSquare, description: 'Créer un sondage rapide' },
    { id: 'quiz', name: 'Quiz', icon: Award, description: 'Lancer un quiz interactif' },
    { id: 'breakout', name: 'Groupes', icon: Users, description: 'Créer des salles de sous-groupes' },
  ];

  return (
    <div className="space-y-4">
      <Button onClick={onEndSession} variant="destructive" size="lg" className="w-full">
          <XCircle className="mr-2 h-5 w-5" />
          Terminer la session pour tous
      </Button>
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

          {/* Timer de session */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Durée de session</p>
              <p className="text-2xl font-bold font-mono">{timerValue}</p>
            </div>
            <div className="flex gap-1">
              {onStartTimer && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onStartTimer}>
                  <Play className="h-4 w-4"/>
                </Button>
              )}
              {onPauseTimer && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPauseTimer}>
                  <Pause className="h-4 w-4"/>
                </Button>
              )}
              {onResetTimer && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onResetTimer}>
                  <RotateCcw className="h-4 w-4"/>
                </Button>
              )}
            </div>
          </div>
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
