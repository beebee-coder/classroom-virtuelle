
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTransition, useState } from 'react';
import { Checkbox } from './ui/checkbox';
import { MessageSquare, Medal } from 'lucide-react';
import { getOrCreateConversation } from '@/lib/actions/conversation.actions';
import { useSession } from 'next-auth/react';
import { DirectMessage } from './DirectMessage';
import type { FullConversation, StudentForCard } from '@/lib/types';


interface StudentCardProps {
  student: StudentForCard;
  isSelected?: boolean;
  onSelectionChange?: (studentId: string, isSelected: boolean) => void;
  isConnected: boolean;
  isSelectable?: boolean;
  rank?: number;
}

export function StudentCard({ 
    student, 
    isSelected = false, 
    onSelectionChange = () => {}, 
    isConnected, 
    isSelectable = true,
    rank
}: StudentCardProps) {
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<FullConversation | null>(null);

  const state = student.etat;
  const isEffectivelySelectable = isSelectable && isConnected;
  const isTeacherView = session?.user.role === 'PROFESSEUR';

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500 fill-yellow-500";
    if (rank === 2) return "text-gray-400 fill-gray-400";
    if (rank === 3) return "text-amber-700 fill-amber-700";
    return "text-muted-foreground";
  }


  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click on card from triggering when clicking on a button inside
    if ((e.target as HTMLElement).closest('button, a, label')) {
        return;
    }
    if (isEffectivelySelectable) {
      onSelectionChange(student.id, !isSelected);
    }
  };

  const handleStartConversation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session?.user.id) return;
    
    startTransition(async () => {
        const conversation = await getOrCreateConversation(session.user.id, student.id);
        setCurrentConversation(conversation as FullConversation);
        setIsDmOpen(true);
    })
  }

  return (
    <>
    <Card 
      onClick={handleCardClick}
      className={cn(
        "flex flex-col transition-all duration-300 relative",
        state?.isPunished && "bg-destructive/10 border-destructive",
        isSelectable && "cursor-pointer",
        isSelected && isSelectable && "ring-2 ring-primary",
        !isEffectivelySelectable && isSelectable && "opacity-60 bg-muted/50 cursor-not-allowed"
      )}
    >
       <div className="absolute top-2 left-2 z-10">
          {rank && (
             <div className="flex items-center gap-1">
                <Medal className={cn("h-5 w-5", getMedalColor(rank))} />
                <span className={cn("font-bold text-sm", rank <= 3 && getMedalColor(rank))}>
                  #{rank}
                </span>
             </div>
          )}
       </div>


      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        <div className={cn("h-2.5 w-2.5 rounded-full", isConnected ? 'bg-green-500' : 'bg-gray-400')} title={isConnected ? 'Connecté' : 'Déconnecté'}></div>
        {isSelectable && (
          <Checkbox
            id={`select-${student.id}`}
            checked={isSelected}
            onClick={(e) => {
                e.stopPropagation();
                if (isEffectivelySelectable) {
                  onSelectionChange(student.id, !isSelected);
                }
            }}
            aria-label={`Sélectionner ${student.name}`}
            disabled={!isEffectivelySelectable}
          />
        )}
      </div>

      <CardHeader className="pt-8 pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-xl">{student.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{student.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow justify-center flex items-center">
        {!isConnected && isSelectable && (
          <p className="text-xs text-center text-muted-foreground font-semibold">Cet élève est hors ligne et ne peut pas être invité.</p>
        )}
         {state?.isPunished && (
           <p className="text-xs text-center text-destructive-foreground font-semibold bg-destructive/80 px-2 py-1 rounded">
               Puni
           </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {isTeacherView && (
          <>
            <Button asChild className="w-full" variant="secondary" onClick={(e) => e.stopPropagation()}>
                <Link href={`/student/${student.id}?viewAs=teacher`}>Voir la page</Link>
            </Button>
            <Button className="w-full" variant="outline" onClick={handleStartConversation} disabled={isPending}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {isPending ? 'Chargement...' : 'Message'}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
     {currentConversation && (
        <DirectMessage 
            conversation={currentConversation}
            isOpen={isDmOpen}
            onOpenChange={setIsDmOpen}
        />
     )}
    </>
  );
}
