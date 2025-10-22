// src/app/session/[id]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/session';
import SessionClient from '@/components/SessionClient';
import { getSessionDetails } from '@/lib/actions/session.actions';
import { Role } from '@/lib/types';
import SessionLoading from '@/components/SessionLoading';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

async function getInitialSessionData(sessionId: string) {
    try {
        const response = await fetch(`http://localhost:3000/api/session/${sessionId}/details`, {
            headers: {
                // This is a server-to-server request, so we don't have cookies to forward.
                // The API route must be public or use a different auth method for this.
                // For the demo, we assume the API is accessible.
            },
            cache: 'no-store' // Ensure fresh data
        });
        
        if (!response.ok) {
            console.error(`[SESSION PAGE] API call failed: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[SESSION PAGE] Fetching initial session data failed:', error);
        return null;
    }
}


export default async function SessionPage({ params }: { params: { id: string } }) {
    const authSession = await getAuthSession();
    
    if (!authSession?.user) {
        redirect('/login');
    }
    
    const initialData = await getInitialSessionData(params.id);
    
    if (!initialData) {
        console.error(`[SESSION PAGE] No initial data for session ${params.id}, redirecting.`);
        redirect(authSession.user.role === Role.PROFESSEUR ? '/teacher/dashboard' : '/student/dashboard');
    }
    
    const { session, students, teacher } = initialData;

    // Security check: ensure the user is part of this session
    const isParticipant = session.participants.some((p: any) => p.id === authSession.user.id);
    if (!isParticipant) {
         console.warn(`[SESSION PAGE] User ${authSession.user.id} is not a participant of session ${params.id}.`);
         notFound();
    }
    
    const currentUserRole = authSession.user.role as Role;
    const currentUserId = authSession.user.id;

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