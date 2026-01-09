// src/components/StudentSessionControls.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Hand, 
  Smile, 
  Meh, 
  Frown, 
  MessageSquare,
  Monitor,
  Headphones,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ComprehensionLevel } from '@/types';


// Objet de configuration pour l'affichage (traduction et style)
const comprehensionDisplayConfig = {
  [ComprehensionLevel.UNDERSTOOD]: { 
    icon: Smile, 
    label: 'Compris', 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500'
  },
  [ComprehensionLevel.CONFUSED]: { 
    icon: Meh, 
    label: 'Confus', 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500'
  },
  [ComprehensionLevel.LOST]: { 
    icon: Frown, 
    label: 'Perdu', 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500'
  },
};

interface StudentSessionControlsProps {
  onRaiseHand: () => void;
  isHandRaised: boolean;
  onComprehensionUpdate: (level: ComprehensionLevel) => void;
  currentComprehension?: ComprehensionLevel;
  onOpenChat?: () => void;
  onSettings?: () => void;
  isLoading?: boolean;
}

export function StudentSessionControls({
  onRaiseHand,
  isHandRaised,
  onComprehensionUpdate,
  currentComprehension = ComprehensionLevel.NONE,
  onOpenChat,
  onSettings,
}: StudentSessionControlsProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  return (
    <Accordion type="multiple" defaultValue={['comprehension', 'interaction']} className="w-full space-y-4">
      {/* Contrôle de compréhension */}
      <Card className="bg-background/80">
        <AccordionItem value="comprehension" className="border-b-0">
          <AccordionTrigger className="p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Ma Compréhension
            </CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">Indiquez votre niveau de compréhension au professeur.</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(comprehensionDisplayConfig).map(([level, config]) => {
                  const isActive = currentComprehension === level;
                  const { icon: Icon, label, color, bgColor, borderColor } = config;
                  
                  return (
                    <Button
                      key={level}
                      variant="outline"
                      className={cn(`h-auto py-3 flex-col gap-2 transition-all`,
                        isActive && `ring-2 ${borderColor}`
                      )}
                      onClick={() => onComprehensionUpdate(level as ComprehensionLevel)}
                    >
                      <Icon className={cn("h-5 w-5", color)} />
                      <span className="text-xs font-medium">{label}</span>
                    </Button>
                  );
                })}
              </div>

              {currentComprehension !== ComprehensionLevel.NONE && (
                <div className="mt-3 p-2 bg-muted rounded-lg text-center">
                  <p className="text-sm font-medium">
                    Statut actuel: 
                    <span className={cn('ml-1', comprehensionDisplayConfig[currentComprehension as keyof typeof comprehensionDisplayConfig].color)}>
                      {comprehensionDisplayConfig[currentComprehension as keyof typeof comprehensionDisplayConfig].label}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Card>

      {/* Contrôles d'interaction */}
      <Card className="bg-background/80">
        <AccordionItem value="interaction" className="border-b-0">
            <AccordionTrigger className="p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hand className="h-5 w-5" />
                  Interagir
                </CardTitle>
            </AccordionTrigger>
             <AccordionContent>
                <CardContent className="space-y-3 pt-0">
                    <Button
                        onClick={onRaiseHand}
                        variant={isHandRaised ? "default" : "outline"}
                        className={cn('w-full justify-center', isHandRaised && 'bg-orange-500 hover:bg-orange-600')}
                        size="lg"
                    >
                        <Hand className={cn("mr-2 h-4 w-4", isHandRaised && 'animate-bounce')} />
                        {isHandRaised ? 'Main levée' : 'Lever la main'}
                    </Button>

                    {onOpenChat && (
                        <Button
                        onClick={onOpenChat}
                        variant="outline"
                        className="w-full"
                        size="lg"
                        >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Ouvrir le chat
                        </Button>
                    )}
                </CardContent>
            </AccordionContent>
        </AccordionItem>
      </Card>
      
      {/* Contrôles média */}
       <Card className="bg-background/80">
        <AccordionItem value="media" className="border-b-0">
            <AccordionTrigger className="p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Paramètres Média
                </CardTitle>
            </AccordionTrigger>
             <AccordionContent>
                <CardContent className="space-y-2 pt-0">
                     <div className="flex gap-2">
                        <Button
                        variant={audioEnabled ? "outline" : "secondary"}
                        className="flex-1 gap-2"
                        size="sm"
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        >
                        <Headphones className="h-4 w-4" />
                        {audioEnabled ? 'Audio ON' : 'Audio OFF'}
                        </Button>
                        
                        <Button
                        variant={videoEnabled ? "outline" : "secondary"}
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
            </AccordionContent>
        </AccordionItem>
      </Card>

    </Accordion>
  );
}

export { ComprehensionLevel };
