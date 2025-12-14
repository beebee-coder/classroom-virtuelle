// src/components/session/StudentSessionControls.tsx - VERSION CORRIGÉE
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Hand, 
  Smile, 
  Meh, 
  Frown, 
  MessageSquare,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { useState, useCallback } from 'react';
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
  onRaiseHand: () => Promise<void> | void; // ✅ Correction : accepter void ou Promise
  isHandRaised: boolean;
  onComprehensionUpdate: (level: ComprehensionLevel) => Promise<void> | void; // ✅ Correction
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
  // ✅ AMÉLIORATION : État local optimiste pour feedback immédiat
  const [pendingComprehension, setPendingComprehension] = useState<ComprehensionLevel | null>(null);
  const [pendingHandRaise, setPendingHandRaise] = useState<boolean | null>(null);

  const effectiveComprehension = pendingComprehension ?? currentComprehension;
  const effectiveHandRaised = pendingHandRaise ?? isHandRaised;

  const handleComprehensionClick = useCallback((level: ComprehensionLevel) => {
    if (isLoading) return;
    
    // ✅ Permettre l'annulation : si déjà actif, passer à NONE
    const newLevel = (effectiveComprehension === level) ? ComprehensionLevel.NONE : level;
    
    // ✅ Feedback immédiat (optimisme applicatif)
    setPendingComprehension(newLevel);
    
    // ✅ Gestion des erreurs améliorée
    try {
      const result = onComprehensionUpdate(newLevel);
      if (result && typeof result.catch === 'function') {
        // Si c'est une Promise, gérer l'erreur
        result.catch(() => {
          setPendingComprehension(currentComprehension);
        });
      }
    } catch (error) {
      // Si c'est une fonction synchrone qui throw une erreur
      setPendingComprehension(currentComprehension);
    }
  }, [isLoading, effectiveComprehension, currentComprehension, onComprehensionUpdate]);

  const handleRaiseHandClick = useCallback(() => {
    if (isLoading) return;
    
    const newHandState = !effectiveHandRaised;
    setPendingHandRaise(newHandState);
    
    try {
      const result = onRaiseHand();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          setPendingHandRaise(isHandRaised);
        });
      }
    } catch (error) {
      setPendingHandRaise(isHandRaised);
    }
  }, [isLoading, effectiveHandRaised, isHandRaised, onRaiseHand]);

  return (
    <div className="space-y-4">
      {/* ✅ PRIORITÉ : Mettre "Interagir" en premier */}
      <Card className="bg-background/80">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hand className="h-4 w-4" />
            Interagir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <Button
            onClick={handleRaiseHandClick}
            variant={effectiveHandRaised ? "default" : "outline"}
            className={cn('w-full justify-center h-12', effectiveHandRaised && 'bg-orange-500 hover:bg-orange-600')}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hand className={cn("mr-2 h-4 w-4", effectiveHandRaised && 'animate-bounce')} />}
            {effectiveHandRaised ? 'Main levée' : 'Lever la main'}
          </Button>

          {onOpenChat && (
            <Button
              onClick={onOpenChat}
              variant="outline"
              className="w-full h-12"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Ouvrir le chat
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Sondage Rapide */}
      <Card className="bg-background/80">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Sondage Rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground mb-3">Indiquez votre niveau de compréhension.</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(comprehensionDisplayConfig).map(([level, config]) => {
              const isActive = effectiveComprehension === level;
              const { icon: Icon, label, color, borderColor } = config;
              
              return (
                <Button
                  key={level}
                  variant="outline"
                  className={cn(`h-auto py-2.5 flex-col gap-1.5 transition-all text-xs`,
                    isActive && `ring-2 ring-offset-1 ${borderColor}`
                  )}
                  onClick={() => handleComprehensionClick(level as ComprehensionLevel)}
                  disabled={isLoading}
                >
                  <Icon className={cn("h-4 w-4", color)} />
                  <span className="font-medium">{label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { ComprehensionLevel };