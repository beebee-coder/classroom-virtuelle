// src/components/StudentSessionControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Hand, 
  Smile, 
  Meh, 
  Frown, 
  MessageSquare,
  Monitor,
  Headphones,
  Settings,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

interface StudentSessionControlsProps {
  onRaiseHand: () => void;
  isHandRaised: boolean;
  onComprehensionUpdate: (level: 'compris' | 'confus' | 'perdu') => void;
  currentComprehension?: 'compris' | 'confus' | 'perdu';
  onOpenChat?: () => void;
  onSettings?: () => void;
  onLeaveSession: () => void;
}

export function StudentSessionControls({
  onRaiseHand,
  isHandRaised,
  onComprehensionUpdate,
  currentComprehension,
  onOpenChat,
  onSettings,
  onLeaveSession
}: StudentSessionControlsProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const comprehensionLevels = [
    { 
      level: 'compris' as const, 
      icon: Smile, 
      label: 'Compris', 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500'
    },
    { 
      level: 'confus' as const, 
      icon: Meh, 
      label: 'Confus', 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500'
    },
    { 
      level: 'perdu' as const, 
      icon: Frown, 
      label: 'Perdu', 
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500'
    }
  ];

  return (
    <div className="space-y-4">
       <Button onClick={onLeaveSession} variant="outline" size="lg" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Quitter la session
       </Button>
      {/* Contrôle de compréhension */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ma Compréhension</CardTitle>
          <CardDescription>
            Indiquez votre niveau de compréhension
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {comprehensionLevels.map(({ level, icon: Icon, label, color, bgColor, borderColor }) => {
              const isActive = currentComprehension === level;
              
              return (
                <Button
                  key={level}
                  variant={isActive ? "default" : "outline"}
                  className={`h-auto py-3 flex-col gap-2 ${
                    isActive 
                      ? `${bgColor} ${borderColor} border-2` 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onComprehensionUpdate(level)}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : color}`} />
                  <span className="text-xs font-medium">{label}</span>
                </Button>
              );
            })}
          </div>

          {/* Statut actuel */}
          {currentComprehension && (
            <div className="mt-3 p-2 bg-muted rounded-lg text-center">
              <p className="text-sm font-medium">
                Statut: 
                <span className={`ml-1 ${
                  currentComprehension === 'compris' ? 'text-green-600' :
                  currentComprehension === 'confus' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {comprehensionLevels.find(c => c.level === currentComprehension)?.label}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contrôles d'interaction */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Interagir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Lever la main */}
          <Button
            onClick={onRaiseHand}
            variant={isHandRaised ? "default" : "outline"}
            className={`w-full justify-start gap-2 ${
              isHandRaised ? 'bg-orange-500 hover:bg-orange-600' : ''
            }`}
            size="lg"
          >
            <Hand className={`h-4 w-4 ${isHandRaised ? 'animate-bounce' : ''}`} />
            {isHandRaised ? 'Main levée' : 'Lever la main'}
          </Button>

          {/* Chat */}
          {onOpenChat && (
            <Button
              onClick={onOpenChat}
              variant="outline"
              className="w-full justify-start gap-2"
              size="lg"
            >
              <MessageSquare className="h-4 w-4" />
              Ouvrir le chat
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contrôles média */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Paramètres Média</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant={audioEnabled ? "default" : "outline"}
              className="flex-1 gap-2"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              <Headphones className="h-4 w-4" />
              {audioEnabled ? 'Audio ON' : 'Audio OFF'}
            </Button>
            
            <Button
              variant={videoEnabled ? "default" : "outline"}
              className="flex-1 gap-2"
              size="sm"
              onClick={() => setVideoEnabled(!videoEnabled)}
            >
              <Monitor className="h-4 w-4" />
              {videoEnabled ? 'Vidéo ON' : 'Vidéo OFF'}
            </Button>
          </div>

          {onSettings && (
            <Button
              onClick={onSettings}
              variant="ghost"
              className="w-full gap-2"
              size="sm"
            >
              <Settings className="h-4 w-4" />
              Paramètres avancés
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Aide rapide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Aide Rapide</CardTitle>
          <CardDescription>
            En cas de problème technique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connexion:</span>
              <span className="text-green-500 font-medium">Stable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Audio:</span>
              <span className="text-green-500 font-medium">Actif</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vidéo:</span>
              <span className="text-green-500 font-medium">Actif</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full mt-3" size="sm">
            Signaler un problème
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
