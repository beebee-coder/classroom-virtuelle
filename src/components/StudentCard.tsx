// src/components/StudentCard.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Crown, Star, XSquare, User as UserIcon } from 'lucide-react';
import type { User } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';

interface StudentCardProps {
  student: ClassroomWithDetails['eleves'][number];
  isOnline: boolean;
  isSelected: boolean;
  isTopStudent: boolean;
  onSelect: (id: string) => void;
  isSelectionDisabled: boolean;
}

const getAvatarUrl = (seed: string) => {
  if (!seed) return '';
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
};

export function StudentCard({
  student,
  isOnline,
  isSelected,
  isTopStudent,
  onSelect,
  isSelectionDisabled,
}: StudentCardProps) {
  const isPunished = student.etat?.isPunished ?? false;
  const isInteractive = !isSelectionDisabled && isOnline;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200",
        isInteractive
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/50"
          : "opacity-60 grayscale",
        isSelected && "ring-2 ring-primary/70 bg-primary/5"
      )}
      onClick={() => isInteractive && onSelect(student.id)}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          onSelect(student.id);
          e.preventDefault();
        }
      }}
      tabIndex={isInteractive ? 0 : -1}
      role="button"
      aria-pressed={isSelected}
      aria-disabled={!isInteractive}
      aria-label={`Élève ${student.name || 'inconnu'}, ${isOnline ? 'en ligne' : 'hors ligne'}. ${
        isSelected ? 'Sélectionné' : 'Appuyez pour sélectionner'
      }`}
    >
      {/* Badge rang (top) ou punition */}
      <div className="absolute top-2 right-2 flex gap-1">
        {isTopStudent && (
          <Crown className="h-5 w-5 text-yellow-500 drop-shadow-sm" aria-hidden="true" />
        )}
        {isPunished && (
          <div className="bg-destructive rounded-full p-0.5">
            <XSquare className="h-3.5 w-3.5 text-destructive-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Avatar + indicateur de présence */}
      <div className="relative flex flex-col items-center">
        <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 ring-border">
          <AvatarImage
            src={student.image || getAvatarUrl(student.id)}
            alt={`Avatar de ${student.name || 'l’élève'}`}
            className="object-cover"
          />
          <AvatarFallback className="bg-muted text-foreground">
            {student.name?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Indicateur de présence */}
        <div
          className={cn(
            "absolute -bottom-1 h-3 w-3 rounded-full border-2 border-background",
            isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
          )}
          aria-hidden="true"
        />
      </div>

      {/* Contenu principal */}
      <div className="mt-3 text-center space-y-1">
        <h3
          className="font-semibold text-sm md:text-base truncate"
          title={student.name || 'Élève'}
        >
          {student.name || 'Élève'}
        </h3>
        <p className="text-xs text-muted-foreground truncate" title={student.ambition || 'Future star'}>
          {student.ambition || 'Future star'}
        </p>
      </div>

      {/* Points */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium">
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
        <span>{(student.points ?? 0).toLocaleString()} pts</span>
      </div>

      {/* Checkbox (coin supérieur gauche) */}
      <div className="absolute top-2 left-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => isInteractive && onSelect(student.id)}
          disabled={!isInteractive}
          aria-label={`Sélectionner ${student.name || 'cet élève'}`}
          className="border-white/70 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
    </div>
  );
}
