// src/app/session/[id]/page.tsx - Version avec API
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import SessionClient from '@/components/SessionClient';
import { Suspense } from 'react';
import { getSessionDetails } from '@/lib/actions/session.actions';
import { getClassroomWithStudents } from '@/lib/actions/classroom.actions';
import type { User, Role, Classroom, EtatEleve } from '@prisma/client';

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

    // **MODIFICATION**: Récupérer les détails de la session via l'action
    let sessionDetails;
    let classroomData: ClassroomWithDetails | null = null;

    try {
        sessionDetails = await getSessionDetails(params.id);
        
        // Utiliser l'ID de la classe des détails de la session si possible
        const classroomId = 'classe-a'; // Utiliser l'ID de classe factice comme dans session.actions.ts
        if (classroomId) {
            try {
                classroomData = await getClassroomWithStudents(classroomId);
                console.log(`🏫 [SESSION PAGE] - Données de classe récupérées: ${classroomData.nom} avec ${classroomData.eleves.length} élèves`);
            } catch (classroomError) {
                console.warn('⚠️ [SESSION PAGE] - Impossible de récupérer les données de classe:', classroomError);
                // On continue sans les données de classe (ne bloque pas la session)
            }
        }
    } catch(e) {
        console.error('❌ [SESSION PAGE] - Impossible de récupérer les détails de la session:', e);
        // Rediriger si la session n'est pas trouvée ou en cas d'erreur
        redirect('/teacher/dashboard?error=session_not_found');
    }

    if (!sessionDetails) {
        notFound();
    }
    
    const { students, teacher } = sessionDetails;

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
            />
        </Suspense>
    );
}
