// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";
import type { Session } from 'next-auth';
import { headers } from 'next/headers';
import { Role } from "./types";
import { dummyStudentData } from "./dummy-data";

// ---=== BYPASS BACKEND - LOGIQUE DE SESSION FACTICE ===---
// Cette fonction simule la récupération d'une session pour le développement
// sans nécessiter une véritable authentification. Elle se base sur un cookie.

export const getAuthSession = async (): Promise<Session | null> => {
    
    // Tente de récupérer le cookie 'dummyRole'
    const headersList = headers();
    const cookieHeader = headersList.get('cookie');
    const dummyRoleCookie = cookieHeader?.split('; ').find(c => c.startsWith('dummyRole='));

    if (dummyRoleCookie) {
        const role = dummyRoleCookie.split('=')[1];
        
        if (role === 'teacher') {
            console.log('🕵️ [SESSION BYPASS] - Session PROFESSEUR simulée active.');
            return {
                user: {
                    id: 'teacher-id',
                    name: 'Professeur Test',
                    email: 'teacher@example.com',
                    image: `https://api.dicebear.com/7.x/pixel-art/svg?seed=teacher-id`,
                    role: Role.PROFESSEUR,
                },
                expires: new Date(Date.now() + 3600 * 1000).toISOString(),
            };
        }
        
        if (role === 'student') {
             console.log('🕵️ [SESSION BYPASS] - Session ÉLÈVE simulée active.');
             const student = dummyStudentData['student1']; // Utilise le premier élève pour la démo
             return {
                user: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    image: student.image ?? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`,
                    role: Role.ELEVE,
                    classeId: student.classe?.id,
                },
                 expires: new Date(Date.now() + 3600 * 1000).toISOString(),
            };
        }
    }
    
    console.log('🕵️ [SESSION BYPASS] - Aucune session simulée active. Utilisation de NextAuth.');
    // Comportement par défaut si aucun cookie de simulation n'est trouvé
    return getServerSession(authOptions);
};
