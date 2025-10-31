// src/app/teacher/class/[id]/SessionLauncher.tsx
'use client';

import { useState, useCallback } from 'react';
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
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    }, []);

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

        setIsStartingSession(true);
        try {
            const session = await createCoursSession(teacher.id, classroom.id, onlineSelectedStudents);
            if (!session?.id) throw new Error('Réponse de session invalide');

            if (session.invitationResults) {
                toast({
                    title: 'Session créée et invitations envoyées !',
                    description: `Session vidéo lancée avec ${session.invitationResults.successful.length} élève(s).`,
                });
            }
            router.push(`/session/${session.id}`);

        } catch (error: unknown) {
            toast({
                variant: 'destructive',
                title: 'Erreur de création de session',
                description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue.',
            });
        } finally {
            setIsStartingSession(false);
        }
    };

    const sortedStudents = [...(classroom.eleves || [])].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
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
