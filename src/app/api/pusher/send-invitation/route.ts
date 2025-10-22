// src/app/api/pusher/send-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pusherTrigger } from '@/lib/pusher/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { channel, event, data } = body;

        console.log('📨 [API INVITATION] - Requête reçue:', { channel, event, data });

        // Validation des paramètres
        if (!channel || !event || !data) {
            return NextResponse.json(
                { error: 'Paramètres manquants: channel, event et data sont requis' },
                { status: 400 }
            );
        }

        // Vérifier que le canal est un canal privé utilisateur
        if (!channel.startsWith('private-user-')) {
            return NextResponse.json(
                { error: 'Canal non autorisé. Seuls les canaux privés utilisateur sont autorisés' },
                { status: 403 }
            );
        }

        console.log('🚀 [API INVITATION] - Envoi via Pusher...');
        
        // Envoyer l'événement via Pusher
        const result = await pusherTrigger(channel, event, data);

        console.log('✅ [API INVITATION] - Invitation envoyée avec succès:', {
            channel,
            event,
            studentId: channel.replace('private-user-', ''),
            sessionId: data.sessionId
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Invitation envoyée',
            channel,
            event,
            studentId: channel.replace('private-user-', '')
        });

    } catch (error) {
        console.error('❌ [API INVITATION] - Erreur:', error);
        return NextResponse.json(
            { 
                error: 'Erreur lors de l\'envoi de l\'invitation',
                details: error instanceof Error ? error.message : 'Erreur inconnue'
            },
            { status: 500 }
        );
    }
}