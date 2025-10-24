// src/components/TeacherSessionControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ScreenShare, 
  Award,
  Monitor,
  Square, // Remplacement de Whiteboard
  FileText,
  Camera
} from 'lucide-react';

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
    { id: 'whiteboard', name: 'Tableau Blanc', icon: Square, description: 'Ouvrir le tableau blanc partagé', action: () => onToolChange('whiteboard') },
    { id: 'document', name: 'Document', icon: FileText, description: 'Partager un document', action: () => onToolChange('document') },
    { id: 'quiz', name: 'Quiz', icon: Award, description: 'Lancer un quiz interactif', action: () => onToolChange('quiz') },
    { id: 'camera', name: 'Caméras', icon: Camera, description: 'Gérer les caméras', action: () => onToolChange('camera') },
    { id: 'screenShare', name: 'Partage', icon: ScreenShare, description: 'Partager l\'écran', action: onScreenShare, isActive: isScreenSharing },
  ];

  return (
    <div className="space-y-4">
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
              const isActive = tool.isActive !== undefined ? tool.isActive : activeTool === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? "default" : "outline"}
                  className="h-auto py-3 flex-col gap-2"
                  onClick={tool.action}
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
