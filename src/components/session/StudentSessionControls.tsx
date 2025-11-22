// src/components/session/StudentSessionControls.tsx
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
  HelpCircle,
  Loader2
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
  isLoading?: boolean;
}

export function StudentSessionControls({
  onRaiseHand,
  isHandRaised,
  onComprehensionUpdate,
  currentComprehension = ComprehensionLevel.NONE,
  onOpenChat,
  isLoading = false,
}: StudentSessionControlsProps) {

  return (
    <Accordion type="multiple" defaultValue={['comprehension', 'interaction']} className="w-full space-y-4">
      {/* Contrôle de compréhension */}
      <Card className="bg-background/80">
        <AccordionItem value="comprehension" className="border-b-0">
          <AccordionTrigger className="p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Sondage Rapide
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
                      disabled={isLoading}
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
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hand className={cn("mr-2 h-4 w-4", isHandRaised && 'animate-bounce')} />}
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
      
    </Accordion>
  );
}

export { ComprehensionLevel };
