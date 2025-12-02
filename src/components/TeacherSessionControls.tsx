// src/components/TeacherSessionControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Award,
  Monitor,
  FilePenLine, // ✅ Icône sémantique pour "Tableau Blanc"
  FileText,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeacherSessionControlsProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function TeacherSessionControls({
  activeTool,
  onToolChange
}: TeacherSessionControlsProps) {
  const tools = [
    { 
      id: 'whiteboard', 
      name: 'Tableau Blanc', 
      icon: FilePenLine, 
      description: 'Ouvrir le tableau blanc partagé',
      action: () => onToolChange('whiteboard') 
    },
    { 
      id: 'document', 
      name: 'Document', 
      icon: FileText, 
      description: 'Partager un document PDF ou image',
      action: () => onToolChange('document') 
    },
    { 
      id: 'quiz', 
      name: 'Quiz', 
      icon: Award, 
      description: 'Lancer un quiz interactif en temps réel',
      action: () => onToolChange('quiz') 
    },
    { 
      id: 'camera', 
      name: 'Caméras', 
      icon: Camera, 
      description: 'Gérer les flux vidéo des participants',
      action: () => onToolChange('camera') 
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
            <Monitor className="h-5 w-5 text-primary" aria-hidden="true" />
            Outils Pédagogiques
          </CardTitle>
          <CardDescription className="text-sm">
            Outils interactifs pour animer votre cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <Button
                  key={tool.id}
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "h-auto py-3 flex flex-col items-center justify-center gap-2 transition-all duration-200",
                    "hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-primary/50",
                    "text-xs font-medium px-2"
                  )}
                  onClick={tool.action}
                  aria-label={`${tool.name}${isActive ? ' (actif)' : ''}`}
                  aria-pressed={isActive}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} 
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-full">{tool.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}