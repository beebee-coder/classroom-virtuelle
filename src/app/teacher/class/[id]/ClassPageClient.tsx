// src/app/teacher/class/[id]/ClassPageClient.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { createCoursSession } from '@/lib/actions/session.actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { AddStudentForm } from './AddStudentForm';
import { ClassroomWithDetails, StudentForCard, AnnouncementWithAuthor } from '@/lib/types';
import { User } from 'next-auth';
import { Header } from '@/components/Header';
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Menu from '@/components/Menu';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { BackButton } from '@/components/BackButton';
import { Video, User as UserIcon, XSquare, Crown } from 'lucide-react';

interface ClassPageClientProps {
    classroom: ClassroomWithDetails;
    teacher: User;
    announcements: AnnouncementWithAuthor[];
}

export default function ClassPageClient({ classroom, teacher, announcements }: ClassPageClientProps) {
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const router = useRouter();
    const { toast } = useToast();

    const handleSelectStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleStartSession = async () => {
        if (selectedStudents.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Aucun élève sélectionné',
                description: 'Veuillez sélectionner au moins un élève pour démarrer la session.',
            });
            return;
        }

        try {
            const session = await createCoursSession(teacher.id, selectedStudents);
            toast({
                title: 'Session créée !',
                description: 'La session vidéo a été lancée.',
            });
            // Redirect to the session page
            router.push(`/session/${session.id}`);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de créer la session.',
            });
        }
    };

    const sortedStudents = [...classroom.eleves].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    return (
        <SidebarProvider>
            <div className="flex flex-col min-h-screen">
                <Header user={teacher}>
                    <SidebarTrigger />
                </Header>
                <div className="flex flex-1">
                    <Sidebar>
                        <SidebarContent>
                            <Menu user={teacher} classrooms={[classroom]} />
                        </SidebarContent>
                    </Sidebar>
                    <SidebarInset>
                        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                                <div className="flex items-center gap-4">
                                    <BackButton />
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight">{classroom.nom}</h1>
                                        <p className="text-muted-foreground">
                                            Gérez vos élèves, annonces et sessions pour cette classe.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <CreateAnnouncementForm classrooms={[classroom]} />
                                     <AddStudentForm classroomId={classroom.id} />
                                </div>
                            </div>
                            
                            {announcements.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Annonces de la classe</h2>
                                    <AnnouncementCarousel announcements={announcements} />
                                </div>
                            )}
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle>Liste des Élèves ({classroom.eleves.length})</CardTitle>
                                    <CardDescription>
                                        Sélectionnez les élèves pour démarrer une session vidéo.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {sortedStudents.map((student, index) => (
                                            <Card 
                                                key={student.id} 
                                                className={`transition-all ${selectedStudents.includes(student.id) ? 'ring-2 ring-primary' : ''}`}
                                            >
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                     <CardTitle className="text-sm font-medium">{student.name}</CardTitle>
                                                     <Checkbox
                                                        checked={selectedStudents.includes(student.id)}
                                                        onCheckedChange={() => handleSelectStudent(student.id)}
                                                    />
                                                </CardHeader>
                                                <CardContent className="text-center">
                                                    <div className="relative inline-block">
                                                        <Avatar className="h-20 w-20 cursor-pointer" onClick={() => router.push(`/student/${student.id}?viewAs=teacher`)}>
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} />
                                                            <AvatarFallback>{student.name?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        {index === 0 && (
                                                            <Crown className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 transform rotate-12" />
                                                        )}
                                                        {student.etat?.isPunished && (
                                                            <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-1">
                                                                <XSquare className="h-4 w-4 text-destructive-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">{student.email}</p>
                                                     <p className="text-xl font-bold">{student.points ?? 0}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handleStartSession} disabled={selectedStudents.length === 0}>
                                        <Video className="mr-2" />
                                        Démarrer la session ({selectedStudents.length})
                                    </Button>
                                </CardFooter>
                            </Card>

                        </main>
                    </SidebarInset>
                </div>
            </div>
        </SidebarProvider>
    );
}