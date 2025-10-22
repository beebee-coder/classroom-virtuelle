// src/app/api/sessions/pending-invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Stockage temporaire en mémoire (pour la démo)
const recentInvitations: any[] = [];

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

        console.log(`📨 [API PENDING] - Recherche d'invitations pour: ${studentId}`);

        // Filtrer les invitations des dernières 10 minutes pour cet élève
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const studentInvitations = recentInvitations.filter(inv => 
            inv.data?.teacherId && 
            new Date(inv.timestamp) > tenMinutesAgo
        );

        console.log(`📨 [API PENDING] - ${studentInvitations.length} invitation(s) trouvée(s) pour ${studentId}`);

        return NextResponse.json(studentInvitations);

    } catch (error) {
        console.error('❌ [API PENDING] - Erreur:', error);
        return NextResponse.json(
            { error: 'Erreur serveur' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channel, event, data } = body;

        console.log('💾 [API PENDING] - Stockage d\'invitation:', { channel, event, data });

        // Stocker l'invitation
        recentInvitations.push({
            channel,
            event,
            data,
            timestamp: new Date().toISOString()
        });

        // Garder seulement les 50 dernières invitations
        if (recentInvitations.length > 50) {
            recentInvitations.splice(0, recentInvitations.length - 50);
        }

        return NextResponse.json({ 
            success: true, 
            stored: true,
            count: recentInvitations.length 
        });

    } catch (error) {
        console.error('❌ [API PENDING] - Erreur de stockage:', error);
        return NextResponse.json(
            { error: 'Erreur de stockage' },
            { status: 500 }
        );
    }
}