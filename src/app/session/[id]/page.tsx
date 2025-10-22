// src/app/session/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import SessionClient from '@/components/SessionClient';
import { getSessionDetails } from '@/lib/actions/session.actions';
import { Role } from '@prisma/client';
import SessionLoading from '@/components/SessionLoading';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

async function getInitialSessionData(sessionId: string) {
    try {
        console.log(`[SESSION PAGE] - Appel de l'API pour les détails de la session: /api/session/${sessionId}/details`);
        const response = await fetch(`http://localhost:3000/api/session/${sessionId}/details`, {
            headers: {
                // This is a server-to-server request, so we don't have cookies to forward.
                // The API route must be public or use a different auth method for this.
                // For the demo, we assume the API is accessible.
            },
            cache: 'no-store' // Ensure fresh data
        });
        
        if (!response.ok) {
            console.error(`[SESSION PAGE] - Échec de l'appel API: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        console.log('[SESSION PAGE] - Données initiales de la session reçues de l\'API:', data);
        return data;
    } catch (error) {
        console.error('[SESSION PAGE] - Erreur lors de la récupération des données initiales de la session:', error);
        return null;
    }
}


export default async function SessionPage({ params }: { params: { id: string } }) {
    console.log(`[SESSION PAGE] - Chargement de la page pour la session ID: ${params.id}`);
    const authSession = await getAuthSession();
    
    if (!authSession?.user) {
        console.log('[SESSION PAGE] - Aucun utilisateur authentifié, redirection vers /login.');
        redirect('/login');
    }
    console.log('[SESSION PAGE] - Utilisateur authentifié:', authSession.user);
    
    const initialData = await getInitialSessionData(params.id);
    
    if (!initialData) {
        console.error(`[SESSION PAGE] - Aucune donnée initiale pour la session ${params.id}, redirection vers le tableau de bord.`);
        redirect(authSession.user.role === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
    }
    
    const { session, students, teacher } = initialData;

    // Security check: ensure the user is part of this session
    const isParticipant = session.participants.some((p: any) => p.id === authSession.user.id);
    if (!isParticipant) {
         console.warn(`[SESSION PAGE] - L'utilisateur ${authSession.user.id} n'est pas un participant de la session ${params.id}. Accès refusé.`);
         notFound();
    }
    
    const currentUserRole = authSession.user.role as Role;
    const currentUserId = authSession.user.id;
    console.log(`[SESSION PAGE] - Rendu du composant SessionClient avec le rôle ${currentUserRole} et l'ID ${currentUserId}.`);

    return (
        <Suspense fallback={<SessionLoading />}>
            <SessionClient
                sessionId={params.id}
                initialSession={session}
                initialStudents={students}
                initialTeacher={teacher}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
            />
        </Suspense>
    );
}
