// src/lib/session.ts
import { type Session, getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

// Le type exporté `DummySession` est conservé pour éviter de casser
// les imports dans d'autres fichiers en attendant leur migration.
// Le type réel utilisé sera `Session` de `next-auth`.
export type DummySession = Session;

export const getAuthSession = async (): Promise<Session | null> => {
    // Utilise la configuration centralisée pour obtenir la session côté serveur
    return await getServerSession(authOptions);
};
