// src/app/session/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import SessionClient from '@/components/SessionClient';
import { Suspense } from 'react';
import { User } from '@/lib/types';
import { allDummyStudents } from '@/lib/dummy-data';


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

// Fonction pour obtenir les données de session factices
function getDummySessionData(sessionId: string) {
    const teacher: User = { 
        id: 'teacher-id', 
        name: 'Professeur Test', 
        email: 'teacher@example.com', 
        role: 'PROFESSEUR',
        image: null,
        emailVerified: null,
        parentPassword: null,
        ambition: null,
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        classeId: null,
    };
    
    // Pour la démo, on prend tous les élèves de la classe A
    const students: User[] = allDummyStudents.filter(s => s.classeId === 'classe-a') as unknown as User[];

    const participants = [teacher, ...students];

    return {
        session: {
            id: sessionId,
            nom: `Session de démo ${sessionId.slice(0, 5)}`,
            participants: participants.map(p => ({ id: p.id, name: p.name, role: p.role })),
            createdAt: new Date().toISOString(),
            status: 'active' as const
        },
        students: students,
        teacher: teacher,
    };
}


export default async function SessionPage({ params }: { params: { id: string } }) {
    console.log(`[SESSION PAGE] - Chargement de la page pour la session ID: ${params.id}`);
    
    if (!params.id) {
        console.error('[SESSION PAGE] - ID de session manquant');
        notFound();
    }

    const authSession = await getAuthSession();
    
    if (!authSession?.user) {
        console.log('[SESSION PAGE] - Aucun utilisateur authentifié, redirection vers /login.');
        redirect('/login');
    }
    
    console.log('[SESSION PAGE] - Utilisateur authentifié:', authSession.user);
    
    const initialData = getDummySessionData(params.id);
    
    const { students, teacher } = initialData;

    // Vérification de sécurité (simplifiée pour la démo)
    const isTeacher = authSession.user.role === 'PROFESSEUR';
    const isInvitedStudent = students.some((s: any) => s.id === authSession.user?.id);
    
    if (!isTeacher && !isInvitedStudent) {
         console.warn(`[SESSION PAGE] - L'utilisateur ${authSession.user.id} n'est pas un participant de la session ${params.id}. Accès refusé.`);
         notFound();
    }
    
    const currentUserRole = authSession.user.role;
    const currentUserId = authSession.user.id;
    console.log(`[SESSION PAGE] - Rendu du composant SessionClient avec le rôle ${currentUserRole} et l'ID ${currentUserId}.`);

    return (
        <Suspense fallback={<SimpleSessionLoading />}>
            <SessionClient
                sessionId={params.id}
                initialStudents={students as any[]}
                initialTeacher={teacher}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
            />
        </Suspense>
    );
}
