
// src/app/teacher/class/[id]/SessionLauncher.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createCoursSession } from '@/lib/actions/session.actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2 } from 'lucide-react';
import { StudentCard } from '@/components/StudentCard';
import type { User } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';

interface SessionLauncherProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    onlineStudents: string[];
}

export function SessionLauncher({ classroom, teacher, onlineStudents }: SessionLauncherProps) {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
    const router = useRouter();
    const { toast } = useToast();

    const handleSelectStudent = useCallback((studentId: string) => {
        if (!studentId) return;

        // Empêcher la sélection si l'élève n'est pas en ligne
        if (!onlineStudents.includes(studentId)) {
            toast({
                variant: 'destructive',
                title: 'Élève hors ligne',
                description: 'Vous ne pouvez pas sélectionner un élève qui n\'est pas connecté.',
            });
            return;
        }

        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    }, [onlineStudents, toast]);

    const handleStartSession = async () => {
        const onlineSelectedStudents = selectedStudents.filter(id => onlineStudents.includes(id));
        
        if (onlineSelectedStudents.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Aucun élève sélectionné en ligne',
                description: 'Veuillez sélectionner au moins un élève actuellement en ligne pour démarrer la session.',
            });
            return;
        }
        console.log('🎯 [SESSION LAUNCHER] - Starting session with students:', onlineSelectedStudents);
        setIsStartingSession(true);
        try {
            // Appel de l'action serveur qui gère tout: création + invitations
            console.log('📤 [SESSION LAUNCHER] - Calling createCoursSession action...');
            const session = await createCoursSession(teacher.id, classroom.id, onlineSelectedStudents);
            
            console.log('✅ [SESSION LAUNCHER] - Session created:', session);
            
            if (!session?.id) throw new Error('Réponse de session invalide');
    
            if (session.invitationResults) {
                const { successful, failed } = session.invitationResults;
                console.log(`📨 [SESSION LAUNCHER] - Invitations sent: ${successful.length} success, ${failed.length} failed`);
                toast({
                    title: 'Session créée et invitations envoyées !',
                    description: `Session vidéo lancée avec ${successful.length} élève(s). ${failed.length > 0 ? `${failed.length} échec(s).` : ''}`,
                });
            }
            // Redirection vers la page de session
            router.push(`/session/${session.id}`);
    
        } catch (error: unknown) {
            console.error('❌ [SESSION LAUNCHER] - Error creating session:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur de création de session',
                description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue.',
            });
             setIsStartingSession(false);
        }
    };

    const sortedStudents = useMemo(() => 
        [...(classroom.eleves || [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)),
        [classroom.eleves]
    );

    const onlineSelectedCount = selectedStudents.filter(id => onlineStudents.includes(id)).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Lancer une Session Vidéo
                    <span className="ml-2 text-sm font-normal text-green-600">
                        • {onlineStudents.length} en ligne
                    </span>
                </CardTitle>
                <CardDescription>
                    Sélectionnez les élèves <span className="font-bold text-green-600">en ligne</span> pour démarrer une session vidéo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {sortedStudents.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">Aucun élève dans cette classe.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                       {sortedStudents.map((student, index) => (
                            <StudentCard
                                key={student.id}
                                student={student}
                                isOnline={onlineStudents.includes(student.id)}
                                isSelected={selectedStudents.includes(student.id)}
                                isTopStudent={index === 0 && sortedStudents.length > 1}
                                onSelect={() => handleSelectStudent(student.id)}
                                isSelectionDisabled={isStartingSession}
                            />
                       ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {onlineSelectedCount > 0 
                        ? `${onlineSelectedCount} élève(s) en ligne sélectionné(s)` 
                        : 'Sélectionnez au moins un élève en ligne'
                    }
                </div>
                <Button 
                    onClick={handleStartSession} 
                    disabled={onlineSelectedCount === 0 || isStartingSession}
                    className="min-w-[180px]"
                >
                    {isStartingSession ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Création...
                        </>
                    ) : (
                        <>
                            <Video className="mr-2 h-4 w-4" />
                            Démarrer la session ({onlineSelectedCount})
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

    