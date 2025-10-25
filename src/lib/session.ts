// src/lib/session.ts
import { type Session, getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options'; // Correction de l'import

// Le type exporté `DummySession` est conservé pour éviter de casser
// les imports dans d'autres fichiers en attendant leur migration.
// Le type réel utilisé sera `Session` de `next-auth`.
export type DummySession = Session;

export const getAuthSession = async (): Promise<Session | null> => {
    try {
        // Utilise la configuration centralisée pour obtenir la session côté serveur
        const session = await getServerSession(authOptions);
        console.log('🔐 [SESSION] Session récupérée:', session ? 'Oui' : 'Non');
        return session;
    } catch (error) {
        console.error('❌ [SESSION] Erreur lors de la récupération de la session:', error);
        return null;
    }
};