// src/app/session/[id]/page.tsx - Version avec base de données
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import SessionClient from '@/components/SessionClient';
import { Suspense } from 'react';
import { getSessionDetails } from '@/lib/actions/session.actions';
import { getClassroomWithStudents } from '@/lib/actions/classroom.actions';
import type { User, Role, Classroom, EtatEleve, DocumentInHistory } from '@prisma/client';
import prisma from '@/lib/prisma';

type ClassroomWithDetails = Classroom & { eleves: (User & { etat: EtatEleve | null })[] };

// Composant de chargement simple
function SimpleSessionLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Chargement de la session...</p>
            </div>
        </div>
    );
}


export default async function SessionPage({ params }: { params: { id: string } }) {
    console.log(`🎬 [SESSION PAGE] - Chargement de la page pour la session ID: ${params.id}`);
    
    if (!params.id) {
        console.error('❌ [SESSION PAGE] - ID de session manquant');
        notFound();
    }

    const authSession = await getAuthSession();
    
    if (!authSession?.user) {
        console.log('🔐 [SESSION PAGE] - Aucun utilisateur authentifié, redirection vers /login.');
        redirect('/login');
    }
    
    console.log('✅ [SESSION PAGE] - Utilisateur authentifié:', authSession.user);

    let sessionDetails;
    let classroomData: ClassroomWithDetails | null = null;
    let sessionFromDb;

    try {
        sessionFromDb = await prisma.coursSession.findUnique({
            where: { id: params.id },
            include: {
                participants: true,
                classe: true
            }
        });
        
        if (!sessionFromDb) {
            notFound();
        }

        sessionDetails = {
            id: sessionFromDb.id,
            teacher: sessionFromDb.participants.find(p => p.role === 'PROFESSEUR'),
            students: sessionFromDb.participants.filter(p => p.role === 'ELEVE'),
            documentHistory: (sessionFromDb as any).documentHistory as DocumentInHistory[],
        };

        if (sessionFromDb.classroomId) {
            classroomData = await prisma.classroom.findUnique({
                where: { id: sessionFromDb.classroomId },
                include: { eleves: { include: { etat: true } } }
            }) as ClassroomWithDetails;
        }

    } catch(e) {
        console.error('❌ [SESSION PAGE] - Impossible de récupérer les détails de la session:', e);
        redirect('/teacher/dashboard?error=session_not_found');
    }

    if (!sessionDetails || !sessionDetails.teacher || !sessionDetails.students) {
        notFound();
    }
    
    const { students, teacher, documentHistory } = sessionDetails;

    // Vérification de sécurité améliorée
    const isTeacher = authSession.user.id === teacher.id;
    const isInvitedStudent = students.some((s: any) => s.id === authSession.user?.id);
    
    if (!isTeacher && !isInvitedStudent) {
        console.warn(`🚫 [SESSION PAGE] - L'utilisateur ${authSession.user.id} n'est pas un participant de la session ${params.id}. Accès refusé.`);
        redirect('/student/dashboard?error=not_invited');
    }
    
    const currentUserRole = authSession.user.role as Role;
    const currentUserId = authSession.user.id;
    
    console.log(`👤 [SESSION PAGE] - Rendu du composant SessionClient avec le rôle ${currentUserRole} et l'ID ${currentUserId}.`);

    return (
        <Suspense fallback={<SimpleSessionLoading />}>
            <SessionClient
                sessionId={params.id}
                initialStudents={students as User[]}
                initialTeacher={teacher as User}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
                classroom={classroomData}
                initialDocumentHistory={documentHistory}
            />
        </Suspense>
    );
}
