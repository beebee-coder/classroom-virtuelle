// src/components/StudentCard.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Crown, Star, XSquare, User as UserIcon } from 'lucide-react';
import type { User, EtatEleve } from '@prisma/client';
import { Button } from './ui/button';

interface StudentCardProps {
    student: User & { etat: { isPunished: boolean, metierId?: string | null } | null };
    isOnline: boolean;
    isSelected: boolean;
    isTopStudent: boolean;
    isPunished: boolean;
    onSelect: (id: string) => void;
    isSelectionDisabled: boolean;
}

export function StudentCard({ 
    student, 
    isOnline, 
    isSelected,
    isTopStudent,
    isPunished,
    onSelect,
    isSelectionDisabled
}: StudentCardProps) {
    const router = useRouter();

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Empêche le déclenchement d'autres clics
        router.push(`/student/${student.id}?viewAs=teacher`);
    };
    
    return (
        <div 
            className="student-card"
            data-effect="zoom"
        >
            <figure className="student-card__image">
                {/* Image de fond, peut être personnalisée par la suite */}
                <img src="https://images.unsplash.com/photo-1579546929518-9e396f3a8034?q=80&w=2070&auto=format&fit=crop" alt="Abstract background" />
            </figure>

            {/* Checkbox de sélection */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(student.id)}
                    disabled={isSelectionDisabled || !isOnline}
                    aria-label={`Sélectionner ${student.name}`}
                    className="bg-background/50 border-white/50"
                />
                 {isOnline ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-background animate-pulse" title="En ligne" />
                ) : (
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-500 border-2 border-background" title="Hors ligne" />
                )}
            </div>

            <div className="student-card__header">
                <Avatar className="student-card__profile">
                    <AvatarImage 
                      src={student.image ?? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} 
                      alt={`Avatar de ${student.name ?? ''}`}
                      className="avatar-image"
                    />
                    <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                {isTopStudent && (
                    <Crown className="absolute -top-1 -right-1 h-7 w-7 text-yellow-300 transform rotate-12 drop-shadow-lg" />
                )}
                 {isPunished && (
                    <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1 z-10">
                        <XSquare className="h-4 w-4 text-destructive-foreground" />
                    </div>
                )}
            </div>

            <div className="student-card__body">
                <h3 className="student-card__name">{student.name || 'Élève'}</h3>
                <p className="student-card__job">{student.ambition || 'Future star'}</p>
                <p className="student-card__bio">
                    Élève passionné avec <span className="font-bold text-white">{student.points ?? 0}</span> points d'expérience.
                </p>
            </div>
            <div className="student-card__footer">
                 <div className="flex items-center justify-between w-full">
                    <p className="card__date flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-yellow-300/80"/> 
                        {student.points ?? 0} pts
                    </p>
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleProfileClick}
                        className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3"
                    >
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profil
                    </Button>
                 </div>
            </div>
        </div>
    );
}
