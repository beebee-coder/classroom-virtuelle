// src/lib/session.ts
import { headers } from 'next/headers';
import { Role } from "./types";
import { allDummyStudents } from "./dummy-data"; // Importer les données

// ---=== BYPASS BACKEND - LOGIQUE DE SESSION FACTICE ===---
// Cette fonction simule la récupération d'une session pour le développement
// sans nécessiter une véritable authentification. Elle se base sur un cookie.

export type DummySession = {
    user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        role?: Role;
        classeId?: string;
    };
    expires: string;
};


export const getAuthSession = async (): Promise<DummySession | null> => {
    
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
             // Utilise le premier élève des données factices pour la cohérence des ID
             const student = allDummyStudents.find(s => s.email === 'ahmed@example.com');
             
             if (!student) {
                console.error("❌ [SESSION BYPASS] - Élève de démo (ahmed@example.com) non trouvé.");
                return null;
             }

             return {
                user: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    image: student.image ?? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`,
                    role: Role.ELEVE,
                    classeId: student.classroomId,
                },
                 expires: new Date(Date.now() + 3600 * 1000).toISOString(),
            };
        }
    }
    
    console.log('🕵️ [SESSION BYPASS] - Aucune session simulée active.');
    // Comportement par défaut si aucun cookie de simulation n'est trouvé
    return null;
};
