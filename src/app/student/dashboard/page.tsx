// This file will be replaced by the content of `src/app/student/[id]/page.tsx` from the reference.
// For now, it's just a placeholder to make routing work.
import { getAuthSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function StudentDashboard() {
    const session = await getAuthSession();
    if (session?.user?.id) {
        redirect(`/student/${session.user.id}`);
    } else {
        redirect('/login');
    }
}
