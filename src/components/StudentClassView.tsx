// src/components/StudentClassView.tsx - VERSION CORRIGÉE
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, Wifi, WifiOff } from "lucide-react";
import type { ClassroomWithStudents } from "@/app/student/class/[id]/page";
import type { User } from "@prisma/client";
import { useAblyPresence } from "@/hooks/useAblyPresence";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Role } from '@prisma/client'; // CORRECTION: Importer le type Role
import { ChatSheet } from "../ChatSheet";

interface StudentClassViewProps {
  classroom: ClassroomWithStudents;
  currentUser: User;
}

export function StudentClassView({ classroom, currentUser }: StudentClassViewProps) {
    const { data: session } = useSession();
    const { onlineMembers, isConnected, enterPresence, isLoading } = useAblyPresence(classroom.id, true, 'StudentClassView');
    const [hasEnteredPresence, setHasEnteredPresence] = useState(false);

    // CORRECTION PRODUCTION: L'étudiant entre en présence quand le canal est prêt
    useEffect(() => {
        if (isConnected && currentUser && !hasEnteredPresence && !isLoading) {
            console.log('👨‍🎓 [ETUDIANT] - Élève entre dans la présence', { 
                userId: currentUser.id, 
                userName: currentUser.name 
            });
            
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
                    console.log(`✅ [ETUDIANT] - ${currentUser.name} est maintenant en présence`);
                } catch (error) {
                    console.error('❌ [ETUDIANT] - Erreur lors de l'entrée en présence:', error);
                    // Réessayer après un délai avec backoff exponentiel
                    setTimeout(() => {
                        setHasEnteredPresence(false);
                    }, 3000);
                }
            };

            enterPresenceWithRetry();
        }
    }, [isConnected, currentUser, enterPresence, isLoading, hasEnteredPresence]);

    // CORRECTION PRODUCTION: Logique de mapping robuste avec vérifications de sécurité
    const onlineStudentIds = useMemo(() => {
        if (!onlineMembers.length) return [];

        const onlineIds: string[] = [];
        
        onlineMembers.forEach(member => {
            // CORRECTION: Vérifications de sécurité pour member.data
            // Priorité 1: Mapping via userId dans data
            if (member.data?.userId) {
                const studentExists = classroom.eleves.some(student => student.id === member.data!.userId);
                if (studentExists) {
                    onlineIds.push(member.data.userId);
                    return;
                }
            }
            
            // CORRECTION: Vérifications de sécurité pour member.data
            // Priorité 2: Mapping via email (plus fiable que le nom)
            if (member.data?.email) {
                const matchingStudent = classroom.eleves.find(student => 
                    student.email?.toLowerCase() === member.data!.email?.toLowerCase()
                );
                if (matchingStudent) {
                    onlineIds.push(matchingStudent.id);
                    return;
                }
            }
            
            // Priorité 3: Fallback via nom (moins fiable)
            if (member.role === Role.ELEVE && member.name) {
                const matchingStudent = classroom.eleves.find(student => {
                    const studentName = student.name?.toLowerCase().trim();
                    const memberName = member.name?.toLowerCase().trim();
                    return studentName === memberName;
                });
                if (matchingStudent) {
                    console.warn(`⚠️ [ETUDIANT] - Mapping fallback via nom pour ${member.name}`);
                    onlineIds.push(matchingStudent.id);
                }
            }
        });

        // Déduplication
        const uniqueIds = [...new Set(onlineIds)];
        console.log(`📊 [ETUDIANT] - ${uniqueIds.length} élèves en ligne sur ${classroom.eleves.length}`);
        return uniqueIds;
    }, [onlineMembers, classroom.eleves]);

    // CORRECTION PRODUCTION: Gestion du nettoyage de la présence
    useEffect(() => {
        return () => {
            // Le hook useAblyPresence gère automatiquement le leave via le cleanup
            console.log('🧹 [ETUDIANT] - Nettoyage du composant StudentClassView');
        };
    }, []);

    // Tri des étudiants par points (décroissant)
    const sortedStudents = useMemo(() => {
        return [...classroom.eleves].sort((a: User, b: User) => 
            (b.points ?? 0) - (a.points ?? 0)
        );
    }, [classroom.eleves]);

    // Statistiques pour l'affichage
    const presenceStats = useMemo(() => {
        const totalStudents = classroom.eleves.length;
        const onlineStudents = onlineStudentIds.length;
        const onlinePercentage = totalStudents > 0 ? Math.round((onlineStudents / totalStudents) * 100) : 0;
        
        return { totalStudents, onlineStudents, onlinePercentage };
    }, [onlineStudentIds.length, classroom.eleves.length]);

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* En-tête avec statistiques */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Ma Classe : {classroom.nom}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Classement et présence des élèves de la classe
                        {isConnected ? (
                            <span className={cn(
                                "ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                presenceStats.onlineStudents > 0 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            )}>
                                <Wifi className="h-3 w-3 mr-1" />
                                {presenceStats.onlineStudents} en ligne ({presenceStats.onlinePercentage}%)
                            </span>
                        ) : (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                <WifiOff className="h-3 w-3 mr-1" />
                                Connexion en cours...
                            </span>
                        )}
                    </p>
                </div>
                 {currentUser.classeId && currentUser.role && (
                  <ChatSheet classroomId={currentUser.classeId} userId={currentUser.id} userRole={currentUser.role} />
                )}
            </div>

            {/* Grille des étudiants */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {sortedStudents.map((student: User, index) => {
                    const isOnline = onlineStudentIds.includes(student.id);
                    const isCurrentUser = currentUser.id === student.id;
                    const rank = index + 1;
                    
                    return (
                        <Card 
                            key={student.id} 
                            className={cn(
                                "relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2",
                                isCurrentUser 
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                                    : "border-transparent",
                                isOnline 
                                    ? "ring-1 ring-green-500/20" 
                                    : "opacity-80"
                            )}
                        >
                            {/* Badge de rang */}
                            {rank <= 3 && (
                                <div className={cn(
                                    "absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm z-10",
                                    rank === 1 ? "bg-yellow-500" :
                                    rank === 2 ? "bg-gray-400" :
                                    "bg-amber-700"
                                )}>
                                    {rank}
                                </div>
                            )}

                            <CardHeader className="items-center pb-3 relative">
                                {/* Indicateur de présence */}
                                <div className="absolute top-3 right-3">
                                    <div className={cn(
                                        "flex items-center gap-1 text-xs px-2 py-1 rounded-full border",
                                        isOnline
                                            ? "text-green-700 bg-green-100 border-green-200 dark:text-green-300 dark:bg-green-900/30 dark:border-green-800"
                                            : "text-muted-foreground bg-muted border-border"
                                    )}>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                                        )} />
                                        <span className="hidden sm:inline">
                                            {isOnline ? "En ligne" : "Hors ligne"}
                                        </span>
                                    </div>
                                </div>

                                {/* Avatar */}
                                <div className="relative">
                                    <Avatar className={cn(
                                        "h-16 w-16 md:h-20 md:w-20 border-2",
                                        isOnline 
                                            ? "border-green-500" 
                                            : "border-gray-300 dark:border-gray-600",
                                        isCurrentUser && "ring-2 ring-blue-500 ring-offset-2"
                                    )}>
                                        <AvatarImage 
                                            src={student.image || undefined}
                                            alt={student.name || 'Avatar élève'}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {student.name?.charAt(0)?.toUpperCase() || 'E'}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    {/* Couronne pour le premier */}
                                    {rank === 1 && (
                                        <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-500 fill-yellow-500" />
                                    )}
                                    
                                    {/* Indicateur "Moi" */}
                                    {isCurrentUser && (
                                        <div className="absolute -bottom-1 -left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                            Moi
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="text-center pt-0">
                                {/* Nom de l'étudiant */}
                                <CardTitle className="text-base md:text-lg font-semibold truncate" title={student.name || 'Élève'}>
                                    {student.name || 'Élève sans nom'}
                                </CardTitle>
                                
                                {/* Points */}
                                <CardDescription className="flex items-center justify-center gap-2 mt-2 text-sm md:text-base">
                                    <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-foreground">
                                        {(student.points || 0).toLocaleString()} pts
                                    </span>
                                </CardDescription>

                                {/* Rang */}
                                <div className="mt-2 text-xs text-muted-foreground">
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
                    <div className="text-muted-foreground">
                        <Crown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-lg">Aucun élève dans cette classe</p>
                        <p className="text-sm mt-2">Les élèves apparaîtront ici une fois ajoutés à la classe</p>
                    </div>
                </div>
            )}
        </main>
    );
}
