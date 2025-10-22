// src/components/ParticipantGrid.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Video, VideoOff, User, Hand, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  email?: string;
  role: 'PROFESSEUR' | 'ELEVE';
  points?: number;
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
  onSpotlight
}: ParticipantGridProps) {
  // Séparer le professeur des élèves
  const teacher = participants.find(p => p.role === 'PROFESSEUR');
  const students = participants.filter(p => p.role === 'ELEVE');

  const getComprehensionIcon = (level: 'compris' | 'confus' | 'perdu' | undefined) => {
    switch (level) {
      case 'compris':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'confus':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'perdu':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
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
        return 'Non défini';
    }
  };

  return (
    <Card className="flex-1">
      <CardContent className="p-4 space-y-4">
        {/* En-tête */}
        <div className="text-center">
          <h3 className="font-semibold text-lg">Participants</h3>
          <p className="text-sm text-muted-foreground">
            {participants.length} participant(s) en ligne
          </p>
        </div>

        {/* Professeur */}
        {teacher && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Professeur</h4>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10 border-2 border-yellow-400">
                <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${teacher.id}`} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{teacher.name}</p>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground truncate">Professeur</p>
              </div>

              <div className="flex items-center gap-1">
                <Video className="h-4 w-4 text-green-500" />
                {onSpotlight && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSpotlight(teacher.id)}
                    className="h-7 text-xs"
                  >
                    Vedette
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Élèves */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Élèves ({students.length})
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {students.map((student) => {
              const isHandRaised = raisedHands.includes(student.id);
              const studentComprehension = comprehension[student.id];
              const isCurrentUser = student.id === currentUserId;

              return (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    isCurrentUser ? 'bg-primary/10 border-primary' : 'bg-background'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} />
                    <AvatarFallback className="text-xs">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {student.name}
                        {isCurrentUser && <span className="text-xs text-muted-foreground"> (Vous)</span>}
                      </p>
                      {isHandRaised && (
                        <Hand className="h-3 w-3 text-orange-500 animate-bounce" />
                      )}
                    </div>
                    
                    {studentComprehension && (
                      <div className="flex items-center gap-1 mt-1">
                        {getComprehensionIcon(studentComprehension)}
                        <span className="text-xs text-muted-foreground">
                          {getComprehensionText(studentComprehension)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Video className="h-3 w-3 text-green-500" />
                    
                    {onSpotlight && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSpotlight(student.id)}
                        className="h-6 px-2 text-xs"
                      >
                        Vedette
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun élève connecté</p>
              </div>
            )}
          </div>
        </div>

        {/* Légende */}
        <div className="pt-2 border-t">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hand className="h-3 w-3 text-orange-500" />
              <span>Main levée</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Compris</span>
            </div>
            <div className="flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-yellow-500" />
              <span>Confus</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              <span>Perdu</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}