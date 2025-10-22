// src/app/student/[id]/page.tsx
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';

// This page is now a shell that redirects to the main student dashboard.
// The content has been moved to /student/dashboard/page.tsx to centralize
// the main student view and avoid redirection loops.
export default async function StudentIdPage({ params }: { params: { id: string } }) {
    const session = await getAuthSession();
    
    // If a user is logged in and trying to access their own ID page,
    // redirect them to the generic dashboard.
    if (session?.user?.id === params.id) {
        redirect(`/student/dashboard`);
    }

    // If a teacher is trying to view a student, this could be a future feature.
    // For now, we redirect teachers to their own dashboard if they land here.
    if (session?.user?.role === 'PROFESSEUR') {
        redirect('/teacher/dashboard');
    }

    // For any other case, or if there's no session, redirect to login.
    redirect('/login');
}
