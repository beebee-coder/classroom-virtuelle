// src/app/teacher/profile/page.tsx
import { BackButton } from "@/components/BackButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAuthSession } from "@/lib/session";
import { Users, Book, Video, Clock } from "lucide-react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function TeacherProfilePage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.role !== 'PROFESSEUR') {
      redirect('/login');
  }

  const user = session.user;
  
  const classrooms = await prisma.classroom.findMany({
      where: { professeurId: user.id },
      include: { _count: { select: { eleves: true }}}
  });

  const totalStudents = classrooms.reduce((acc, curr) => acc + curr._count.eleves, 0);
  
  const sessions = await prisma.coursSession.findMany({
      where: { professeurId: user.id, endTime: { not: null } }
  });

  const totalSessions = sessions.length;
  const averageDuration = totalSessions > 0
    ? sessions.reduce((acc, s) => {
        if (s.endTime && s.startTime) {
            return acc + (s.endTime.getTime() - s.startTime.getTime());
        }
        return acc;
    }, 0) / totalSessions / 1000 / 60 // in minutes
    : 0;


  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profil du Professeur</h1>
          <p className="text-muted-foreground">Vos informations et statistiques.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
             <div className="flex flex-col items-center gap-4">
                <ProfileAvatar user={user as any} isInteractive={true} className="h-24 w-24 text-4xl" />
                <div>
                    <CardTitle className="text-3xl text-center">{user.name}</CardTitle>
                    <CardDescription className="text-center">{user.email}</CardDescription>
                </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Statistiques</CardTitle>
                <CardDescription>Aperçu de votre activité sur la plateforme.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center p-4 bg-muted rounded-lg">
                        <div className="p-3 bg-primary/10 rounded-full mr-4">
                            <Book className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{classrooms.length}</p>
                            <p className="text-sm text-muted-foreground">Classe(s) Gérée(s)</p>
                        </div>
                    </div>
                     <div className="flex items-center p-4 bg-muted rounded-lg">
                        <div className="p-3 bg-primary/10 rounded-full mr-4">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalStudents}</p>
                            <p className="text-sm text-muted-foreground">Élève(s) au total</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <CardTitle>Rapport de Session</CardTitle>
                <CardDescription>Analyse de vos sessions d'enseignement.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center p-4 bg-muted rounded-lg">
                        <div className="p-3 bg-blue-500/10 rounded-full mr-4">
                            <Video className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totalSessions}</p>
                            <p className="text-sm text-muted-foreground">Sessions totales</p>
                        </div>
                    </div>
                     <div className="flex items-center p-4 bg-muted rounded-lg">
                        <div className="p-3 bg-green-500/10 rounded-full mr-4">
                            <Clock className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{Math.round(averageDuration)}m</p>
                            <p className="text-sm text-muted-foreground">Durée moyenne</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
