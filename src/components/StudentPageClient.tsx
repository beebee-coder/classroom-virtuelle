// src/components/StudentPageClient.tsx
'use client';

import { useState } from 'react';
import { StudentWithStateAndCareer, AppTask, AnnouncementWithAuthor } from '@/lib/types';
import type { Metier } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Zap, Megaphone } from 'lucide-react';
import { TaskBoard } from '@/components/TaskBoard';
import { CareerSelector } from '@/components/CareerSelector';
import { AnnouncementCarousel } from '@/components/AnnouncementCarousel';
import { BackButton } from '@/components/BackButton';

interface StudentPageClientProps {
    student: StudentWithStateAndCareer;
    announcements: AnnouncementWithAuthor[];
    allCareers: Metier[];
    isTeacherView: boolean;
    tasks: AppTask[];
}

export default function StudentPageClient({ student, announcements, allCareers, isTeacherView, tasks }: StudentPageClientProps) {
    const [currentCareer, setCurrentCareer] = useState(student.etat?.metier ?? null);

    const level = Math.floor((student.points ?? 0) / 1000);
    const progress = (((student.points ?? 0) % 1000) / 1000) * 100;

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {isTeacherView && (
                 <div className="mb-6">
                    <BackButton />
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Colonne de gauche - Profil & Progression */}
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-center text-2xl">{student.name}</CardTitle>
                            <CardDescription className="text-center">"{student.ambition}"</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <div className="text-5xl font-bold text-primary">{student.points?.toLocaleString() ?? 0}</div>
                            <p className="text-sm text-muted-foreground">Points d'Expérience</p>
                            
                            <div className="mt-4">
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span>Niveau {level}</span>
                                    <span>{1000 - (student.points ?? 0) % 1000} pts pour le prochain niveau</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Trophy /> Métier Actuel</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentCareer ? (
                                <div>
                                    <h3 className="font-bold text-lg">{currentCareer.nom}</h3>
                                    <p className="text-sm text-muted-foreground">{currentCareer.description}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aucun métier sélectionné. Explore la bibliothèque !</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Colonne de droite - Tâches & Annonces */}
                <div className="lg:col-span-2 space-y-8">
                     {announcements && announcements.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Megaphone /> Annonces</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <AnnouncementCarousel announcements={announcements} />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Zap /> Mes Tâches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TaskBoard 
                                tasks={tasks} 
                                studentProgress={student.progress || []}
                                studentId={student.id}
                            />
                        </CardContent>
                    </Card>

                    {isTeacherView && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Changer le métier de l'élève</CardTitle>
                                <CardDescription>Sélectionnez un métier pour voir le thème s'appliquer.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CareerSelector 
                                    careers={allCareers} 
                                    studentId={student.id} 
                                    currentCareerId={currentCareer?.id ?? null}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </main>
    );
}
