
// src/app/teacher/class/[id]/StudentProfileCard.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, Star, XSquare, User as UserIcon } from 'lucide-react';
import type { User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import type { ClassroomWithDetails } from '@/types';


interface StudentProfileCardProps {
    student: ClassroomWithDetails['eleves'][number];
    isOnline: boolean;
    isTopStudent: boolean;
}

export function StudentProfileCard({ 
    student, 
    isOnline, 
    isTopStudent,
}: StudentProfileCardProps) {
    const router = useRouter();

    const handleProfileClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/teacher/student/${student.id}`);
    };

    const isPunished = student.etat?.isPunished ?? false;
    
    return (
        <div 
            onClick={handleProfileClick}
            className="student-card group"
            data-effect="zoom"
        >
            <figure className="student-card__image">
                <img src="https://images.unsplash.com/photo-1579546929518-9e396f3a8034?q=80&w=2070&auto=format&fit=crop" alt="Abstract background" />
            </figure>

            <div className="absolute top-2 right-2 z-20">
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
                    Cliquez pour voir le profil détaillé, les tâches et la progression de cet élève.
                </p>
            </div>
            <div className="student-card__footer">
                 <div className="flex items-center justify-center w-full">
                    <p className="card__date flex items-center gap-1.5">
                        <Star className="h-3 w-3 text-yellow-300/80"/> 
                        {student.points ?? 0} pts
                    </p>
                 </div>
            </div>
        </div>
    );
}
