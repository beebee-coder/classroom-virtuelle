// src/app/api/sessions/pending-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Stockage temporaire en mémoire (pour la démo)
// La structure est un tableau d'invitations.
const recentInvitations: any[] = [];
const INVITATION_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const studentId = searchParams.get('studentId');

        if (!studentId) {
            return NextResponse.json(
                { error: 'studentId est requis' },
                { status: 400 }
            );
        }

        console.log(`📨 [API PENDING] Recherche d'invitations pour l'élève: ${studentId}`);

        // Filtrer les invitations pour cet élève qui sont encore valides
        const tenMinutesAgo = new Date(Date.now() - INVITATION_TTL);
        const studentInvitations = recentInvitations.filter(inv => 
            inv.data?.sessionId && // Vérifie que c'est une invitation de session
            new Date(inv.timestamp) > tenMinutesAgo
        );

        console.log(`📨 [API PENDING] - ${studentInvitations.length} invitation(s) valide(s) trouvée(s) pour ${studentId}`);

        return NextResponse.json(studentInvitations);

    } catch (error) {
        console.error('❌ [API PENDING] - Erreur lors de la récupération:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        console.log('💾 [API PENDING] - Stockage d\'une nouvelle invitation:', body);

        // Ajoute l'invitation au tableau avec un timestamp
        recentInvitations.push({
            ...body,
            timestamp: new Date().toISOString()
        });

        // Nettoyer les vieilles invitations pour ne pas saturer la mémoire
        const now = Date.now();
        const freshInvitations = recentInvitations.filter(
            inv => now - new Date(inv.timestamp).getTime() < INVITATION_TTL
        );
        // Remplacer l'ancien tableau par le nouveau
        recentInvitations.length = 0;
        Array.prototype.push.apply(recentInvitations, freshInvitations);

        console.log(`💾 [API PENDING] - Stockage réussi. Total invitations en mémoire: ${recentInvitations.length}`);

        return NextResponse.json({ 
            success: true, 
            stored: true,
            count: recentInvitations.length 
        });

    } catch (error) {
        console.error('❌ [API PENDING] - Erreur lors du stockage:', error);
        return NextResponse.json(
            { error: 'Erreur de stockage' },
            { status: 500 }
        );
    }
}
