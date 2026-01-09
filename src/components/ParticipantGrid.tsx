// src/components/ParticipantGrid.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Crown,
  Video,
  VideoOff,
  User,
  Hand,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  name: string;
  email?: string;
  role: 'PROFESSEUR' | 'ELEVE';
  points?: number;
  isAudioMuted?: boolean;
  isVideoOff?: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
  currentUserId: string;
  raisedHands: string[];
  comprehension: Record<string, 'compris' | 'confus' | 'perdu'>;
  onSpotlight?: (participantId: string) => void;
}

export function ParticipantGrid({
  participants,
  currentUserId,
  raisedHands,
  comprehension,
  onSpotlight,
}: ParticipantGridProps) {
  const teacher = participants.find((p) => p.role === 'PROFESSEUR');
  const students = participants.filter((p) => p.role === 'ELEVE');

  const getComprehensionIcon = (level: 'compris' | 'confus' | 'perdu' | undefined) => {
    switch (level) {
      case 'compris':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
      case 'confus':
        return <HelpCircle className="h-3.5 w-3.5 text-amber-600" />;
      case 'perdu':
        return <AlertCircle className="h-3.5 w-3.5 text-rose-600" />;
      default:
        return null;
    }
  };

  const getComprehensionText = (level: 'compris' | 'confus' | 'perdu' | undefined) => {
    switch (level) {
      case 'compris':
        return 'Compris';
      case 'confus':
        return 'Confus';
      case 'perdu':
        return 'Perdu';
      default:
        return 'Non signalé';
    }
  };

  // ✅ Correction de l’URL DiceBear (suppression des espaces)
  const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <Card className="flex-1 overflow-hidden">
      <CardContent className="p-4 space-y-4 max-h-full flex flex-col">
        {/* En-tête */}
        <div className="text-center">
          <h3 className="font-semibold text-base">Participants</h3>
          <p className="text-xs text-muted-foreground">
            {participants.length} en ligne
          </p>
        </div>

        {/* Professeur */}
        {teacher && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enseignant</h4>
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-yellow-500">
                  <AvatarImage src={getAvatarUrl(teacher.id)} />
                  <AvatarFallback className="bg-yellow-100 text-yellow-800">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <Crown className="absolute -bottom-1 -right-1 h-4 w-4 text-yellow-600 bg-background rounded-full border" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{teacher.name}</p>
                <p className="text-xs text-muted-foreground">Professeur</p>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {teacher.isVideoOff ? (
                    <VideoOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Caméra désactivée" />
                  ) : (
                    <Video className="h-3.5 w-3.5 text-green-600" aria-label="Caméra active" />
                  )}
                  {teacher.isAudioMuted !== undefined && (
                    teacher.isAudioMuted ? (
                      <MicOff className="h-3.5 w-3.5 text-muted-foreground" aria-label="Micro désactivé" />
                    ) : (
                      <Mic className="h-3.5 w-3.5 text-green-600" aria-label="Micro activé" />
                    )
                  )}
                </div>
                {onSpotlight && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSpotlight(teacher.id)}
                    className="h-7 text-xs px-2"
                    aria-label={`Mettre ${teacher.name} en vedette`}
                  >
                    Vedette
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Élèves */}
        <div className="space-y-2 flex-1 min-h-0">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Élèves
            </h4>
            <span className="text-xs text-muted-foreground">({students.length})</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {students.length > 0 ? (
              students.map((student) => {
                const isHandRaised = raisedHands.includes(student.id);
                const studentComprehension = comprehension[student.id];
                const isCurrentUser = student.id === currentUserId;

                return (
                  <div
                    key={student.id}
                    className={cn(
                      'flex items-center gap-3 p-2.5 rounded-lg border transition-colors',
                      isCurrentUser
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-background hover:bg-muted/30 border-muted'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getAvatarUrl(student.id)} />
                        <AvatarFallback className="text-xs bg-muted">
                          {student.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isHandRaised && (
                        <Hand className="absolute -top-1 -right-1 h-3 w-3 text-orange-500 animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">
                          {student.name}
                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground ml-1">(Vous)</span>
                          )}
                        </p>
                      </div>

                      {studentComprehension && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {getComprehensionIcon(studentComprehension)}
                          <span className="text-xs text-muted-foreground">
                            {getComprehensionText(studentComprehension)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        {student.isVideoOff ? (
                          <VideoOff className="h-3 w-3 text-muted-foreground" aria-label="Caméra désactivée" />
                        ) : (
                          <Video className="h-3 w-3 text-green-600" aria-label="Caméra active" />
                        )}
                      </div>
                      {onSpotlight && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSpotlight(student.id)}
                          className="h-6 px-2 text-xs hover:bg-accent"
                          aria-label={`Mettre ${student.name} en vedette`}
                        >
                          Vedette
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <User className="h-8 w-8 opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground">Aucun élève connecté</p>
                <p className="text-xs mt-1">Ils apparaîtront ici à leur arrivée</p>
              </div>
            )}
          </div>
        </div>

        {/* Légende compacte */}
        <div className="pt-2 border-t border-border">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hand className="h-3 w-3 text-orange-500" />
              <span>Main levée</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <span>Compris</span>
            </div>
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-amber-600" />
              <span>Confus</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-rose-600" />
              <span>Perdu</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}