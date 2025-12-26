// src/components/StudentClassView.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, Wifi, WifiOff, User as UserIcon } from "lucide-react";
import type { ClassroomWithStudents } from "@/app/student/class/[id]/page";
import type { User } from "@prisma/client";
import { useAblyPresence } from "@/hooks/useAblyPresence";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Role } from '@prisma/client'; 
import { ChatSheet } from "./ChatSheet";

interface StudentClassViewProps {
  classroom: ClassroomWithStudents;
  currentUser: User;
}

export function StudentClassView({ classroom, currentUser }: StudentClassViewProps) {
  const { data: session } = useSession();
  const { onlineMembers, isConnected, enterPresence, isLoading } = useAblyPresence(classroom.id, true, 'StudentClassView');
  const [hasEnteredPresence, setHasEnteredPresence] = useState(false);

  // Gestion entrée en présence
  useEffect(() => {
    if (isConnected && currentUser && !hasEnteredPresence && !isLoading) {
      const enterPresenceWithRetry = async () => {
        try {
          await enterPresence({
            name: currentUser.name || 'Élève',
            role: Role.ELEVE,
            image: currentUser.image || null,
            data: {
              userId: currentUser.id,
              email: currentUser.email || undefined
            }
          });
          setHasEnteredPresence(true);
        } catch (error) {
          console.error('❌ [ETUDIANT] - Erreur lors de l\'entrée en présence:', error);
          setTimeout(() => setHasEnteredPresence(false), 3000);
        }
      };
      enterPresenceWithRetry();
    }
  }, [isConnected, currentUser, enterPresence, isLoading, hasEnteredPresence]);

  // Mapping robuste des étudiants en ligne
  const onlineStudentIds = useMemo(() => {
    if (!onlineMembers.length) return [];

    const onlineIds: string[] = [];
    
    onlineMembers.forEach(member => {
      // Priorité à l'ID de l'utilisateur dans les données
      const memberUserId = member.data?.userId || member.id;

      if (classroom.eleves.some(student => student.id === memberUserId)) {
        onlineIds.push(memberUserId);
        return;
      }
      
      // Fallback sur l'email si l'ID ne correspond pas
      if (member.data?.email) {
        const matchingStudent = classroom.eleves.find(student => 
          student.email?.toLowerCase() === member.data!.email?.toLowerCase()
        );
        if (matchingStudent) {
          onlineIds.push(matchingStudent.id);
          return;
        }
      }
    });

    return [...new Set(onlineIds)];
  }, [onlineMembers, classroom.eleves]);


  // Tri par points
  const sortedStudents = useMemo(() => {
    return [...classroom.eleves].sort((a: User, b: User) => 
      (b.points ?? 0) - (a.points ?? 0)
    );
  }, [classroom.eleves]);

  // Stats de présence
  const presenceStats = useMemo(() => {
    const totalStudents = classroom.eleves.length;
    const onlineStudents = onlineStudentIds.length;
    const onlinePercentage = totalStudents > 0 ? Math.round((onlineStudents / totalStudents) * 100) : 0;
    return { totalStudents, onlineStudents, onlinePercentage };
  }, [onlineStudentIds.length, classroom.eleves.length]);

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
  };

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ma Classe : {classroom.nom}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <span>Présence et classement des élèves</span>
            {isConnected ? (
              <span 
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  presenceStats.onlineStudents > 0 
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                )}
                aria-live="polite"
              >
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                {presenceStats.onlineStudents} en ligne ({presenceStats.onlinePercentage}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                Initialisation…
              </span>
            )}
          </div>
        </div>
        
        {currentUser.classeId && currentUser.role && (
          <ChatSheet classroomId={currentUser.classeId} userId={currentUser.id} userRole={currentUser.role} />
        )}
      </div>

      {/* Grille élèves */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {sortedStudents.map((student: User, index) => {
          const isOnline = onlineStudentIds.includes(student.id);
          const isCurrentUser = currentUser.id === student.id;
          const rank = index + 1;
          
          return (
            <Card 
              key={student.id} 
              className={cn(
                "relative overflow-hidden transition-all duration-200 hover:shadow-md",
                isCurrentUser 
                  ? "ring-2 ring-primary/30 bg-primary/5" 
                  : "border-border",
                !isOnline && "opacity-70"
              )}
            >
              {/* Badge rang (top 3) */}
              {rank <= 3 && (
                <div className={cn(
                  "absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm z-10 border-2 border-white dark:border-gray-900 shadow-sm",
                  rank === 1 ? "bg-yellow-500" :
                  rank === 2 ? "bg-gray-500" :
                  "bg-amber-700"
                )}>
                  {rank}
                </div>
              )}

              <CardHeader className="items-center pb-3 relative">
                {/* Indicateur de présence */}
                <div className="absolute top-3 right-3">
                  <span 
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      isOnline
                        ? "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30"
                        : "text-muted-foreground bg-muted"
                    )}
                    aria-label={isOnline ? "En ligne" : "Hors ligne"}
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                    )} />
                    <span className="hidden xs:inline">{isOnline ? "En ligne" : "Hors ligne"}</span>
                  </span>
                </div>

                {/* Avatar */}
                <div className="relative">
                  <Avatar className={cn(
                    "h-16 w-16 md:h-20 md:w-20",
                    isOnline ? "ring-2 ring-emerald-500/30" : "ring-1 ring-border"
                  )}>
                    <AvatarImage 
                      src={student.image || getAvatarUrl(student.id)} 
                      alt={student.name || 'Avatar élève'}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-muted text-foreground">
                      {student.name?.charAt(0)?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Couronne #1 */}
                  {rank === 1 && (
                    <Crown className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500" />
                  )}
                  
                  {/* Badge "Moi" */}
                  {isCurrentUser && (
                    <div className="absolute -bottom-1 -left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Moi
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="text-center pt-1">
                <CardTitle 
                  className="text-sm md:text-base font-semibold truncate px-1"
                  title={student.name || 'Élève'}
                >
                  {student.name || 'Élève'}
                </CardTitle>
                
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                  <span className="font-semibold text-sm">
                    {(student.points || 0).toLocaleString()} pts
                  </span>
                </div>

                <div className="mt-2 text-[10px] text-muted-foreground">
                  Rang #{rank}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* État vide */}
      {sortedStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center justify-center text-muted-foreground">
            <Crown className="h-10 w-10 mb-3 opacity-50" aria-hidden="true" />
            <p className="text-lg font-medium mb-1">Aucun élève dans cette classe</p>
            <p className="text-sm max-w-md text-center">
              Les élèves apparaîtront ici une fois ajoutés à la classe.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
