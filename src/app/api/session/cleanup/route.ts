// src/app/api/session/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/actions/session.actions';

export async function POST(request: NextRequest) {
    try {
        console.log('🧹 [API CLEANUP] - Déclenchement du nettoyage des sessions...');
        
        const result = await cleanupExpiredSessions();
        
        return NextResponse.json({
            success: true,
            message: `Nettoyage terminé: ${result.cleaned} sessions expirées nettoyées`,
            cleaned: result.cleaned
        });
        
    } catch (error) {
        console.error('❌ [API CLEANUP] - Erreur:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Échec du nettoyage des sessions' 
            },
            { status: 500 }
        );
    }
}
