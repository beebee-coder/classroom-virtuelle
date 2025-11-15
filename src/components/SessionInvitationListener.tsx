// src/components/SessionInvitationListener.tsx - VERSION CORRIGÉE
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAbly } from '@/hooks/useAbly';
import { getUserChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import type { Types as AblyTypes } from 'ably';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, XCircle, Clock, X } from 'lucide-react';

interface SessionInvitation {
  sessionId: string;
  teacherId: string;
  classroomId: string;
  classroomName: string;
  teacherName: string;
  timestamp: string;
  type: 'session-invitation';
}

interface SessionInvitationListenerProps {
  studentId: string;
  className?: string;
}

export function SessionInvitationListener({ studentId, className = '' }: SessionInvitationListenerProps) {
  const [sessionInvitation, setSessionInvitation] = useState<SessionInvitation | null>(null);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [isCheckingPending, setIsCheckingPending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const { client: ablyClient, isConnected: ablyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';
  
  // CORRECTION: Simplification des références
  const processedInvitationsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  // CORRECTION: Fonction handleInvitation simplifiée
  const handleInvitation = useCallback((data: SessionInvitation) => {
    if (!mountedRef.current) return;
    
    // Éviter les doublons
    if (processedInvitationsRef.current.has(data.sessionId)) {
      console.log(`🔄 [INVITE LISTENER] - Invitation ${data.sessionId} déjà traitée`);
      return;
    }
    
    console.log(`✅ [INVITE LISTENER] - Nouvelle invitation reçue: ${data.sessionId}`);
    processedInvitationsRef.current.add(data.sessionId);
    
    setSessionInvitation(data);
    
    toast({
      title: '🎯 Invitation de session reçue !',
      description: `${data.teacherName} vous invite à une session vidéo`,
      duration: 10000,
    });
  }, [toast]);

  // CORRECTION: Fonction checkPendingInvitations simplifiée
  const checkPendingInvitations = useCallback(async () => {
    if (!studentId || !mountedRef.current) return;
    
    setIsCheckingPending(true);
    try {
      console.log(`🔍 [INVITE LISTENER] - Vérification des invitations en attente pour: ${studentId}`);
      const response = await fetch(`/api/session/pending-invitations?studentId=${studentId}`);
      
      if (!mountedRef.current) return;
      
      if (response.ok) {
        const pendingSessions = await response.json();
        console.log(`📥 [INVITE LISTENER] - ${pendingSessions.length} sessions en attente trouvées`);
        
        if (pendingSessions.length > 0 && mountedRef.current) {
          const latestSession = pendingSessions[0];
          if (latestSession && !processedInvitationsRef.current.has(latestSession.id)) {
            const invitation: SessionInvitation = {
              sessionId: latestSession.id || latestSession.sessionId,
              teacherId: latestSession.teacherId,
              classroomId: latestSession.classroomId,
              classroomName: latestSession.classroomName || 'Classe',
              teacherName: latestSession.teacherName || 'Professeur',
              timestamp: latestSession.timestamp || new Date().toISOString(),
              type: 'session-invitation'
            };
            
            handleInvitation(invitation);
          }
        }
      }
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Erreur vérification invitations:', error);
    } finally {
      if (mountedRef.current) {
        setIsCheckingPending(false);
      }
    }
  }, [studentId, handleInvitation]);

  // CORRECTION: Acceptation d'invitation améliorée
  const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
    if (!mountedRef.current) return;
    
    setIsJoiningSession(true);
    
    try {
      console.log(`🎯 [INVITE LISTENER] - Acceptation invitation: ${invitation.sessionId}`);
      
      const response = await fetch('/api/session/student-joined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: invitation.sessionId,
          studentId: studentId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      processedInvitationsRef.current.add(invitation.sessionId);
      
      if (mountedRef.current) {
        setSessionInvitation(null);
        toast({ 
          title: 'Connexion...', 
          description: 'Rejoindre la session vidéo...' 
        });
        // CORRECTION: Utiliser replace au lieu de push pour éviter l'historique
        router.replace(`/session/${invitation.sessionId}`);
      }
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Erreur rejoindre session:', error);
      if (mountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur de connexion',
          description: 'Impossible de rejoindre la session.'
        });
        setIsJoiningSession(false);
      }
    }
  }, [router, toast, studentId]);

  const handleDeclineInvitation = useCallback(() => {
    if (!mountedRef.current || !sessionInvitation) return;
    
    processedInvitationsRef.current.add(sessionInvitation.sessionId);
    
    // Notification optionnelle du refus
    fetch('/api/session/decline-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionInvitation.sessionId,
        studentId: studentId
      })
    }).catch(console.error);
    
    if (mountedRef.current) {
      setSessionInvitation(null);
      toast({ title: 'Invitation refusée' });
    }
  }, [toast, sessionInvitation, studentId]);

  const handleCloseInvitation = useCallback(() => {
    if (mountedRef.current) {
      setSessionInvitation(null);
    }
  }, []);

  // CORRECTION: Effet principal SIMPLIFIÉ - Éviter les boucles
  useEffect(() => {
    mountedRef.current = true;
    let channel: AblyTypes.RealtimeChannelCallbacks | null = null;

    const setupAblySubscription = async () => {
      if (!studentId || !ablyClient || !ablyConnected || !mountedRef.current) {
        return;
      }

      try {
        const channelName = getUserChannelName(studentId);
        console.log(`📡 [INVITE LISTENER] - Configuration Ably: ${channelName}`);
        
        channel = ablyClient.channels.get(channelName);
        
        if (channel.state !== 'attached') {
          await channel.attach();
        }
        
        // CORRECTION: Listener direct sans référence complexe
        channel.subscribe(AblyEvents.SESSION_INVITATION, (message: AblyTypes.Message) => {
          if (mountedRef.current && message.name === AblyEvents.SESSION_INVITATION) {
            console.log(`📨 [INVITE LISTENER] - Invitation temps réel: ${message.data.sessionId}`);
            handleInvitation(message.data);
          }
        });
        
        console.log(`✅ [INVITE LISTENER] - Abonnement réussi: ${channelName}`);
        
      } catch (error) {
        console.error('❌ [INVITE LISTENER] - Erreur configuration Ably', error);
      }
    };

    // CORRECTION: Initialisation unique
    if (ablyConnected && studentId) {
      checkPendingInvitations();
      setupAblySubscription();
    }

    // CORRECTION: Nettoyage SEULEMENT à la destruction
    return () => {
      mountedRef.current = false;
      
      if (channel) {
        try {
          channel.unsubscribe();
          console.log(`🧹 [INVITE LISTENER] - Nettoyage Ably`);
        } catch (error) {
          console.error('❌ [INVITE LISTENER] - Erreur nettoyage', error);
        }
      }
    };
  // CORRECTION: Dépendances réduites au strict nécessaire
  }, [studentId, ablyConnected, handleInvitation]); // Retirer checkPendingInvitations pour éviter les boucles

  // CORRECTION: Effet séparé pour la reconnexion
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (ablyConnected && studentId && !sessionInvitation) {
      console.log(`🔄 [INVITE LISTENER] - Reconnexion détectée, vérification...`);
      checkPendingInvitations();
    }
  }, [ablyConnected, studentId, sessionInvitation, checkPendingInvitations]);

  if (!sessionInvitation) {
    return null;
  }

  return (
    <Card className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 shadow-lg relative ${className}`}>
      <button
        onClick={handleCloseInvitation}
        className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
        aria-label="Fermer l'invitation"
      >
        <X className="h-5 w-5" />
      </button>
      <CardContent className="p-4 pr-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-2 rounded-full">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Invitation à une session vidéo</h3>
              <p className="text-blue-100">{sessionInvitation.teacherName} vous invite</p>
              <p className="text-blue-100 text-sm">Classe: {sessionInvitation.classroomName}</p>
              <p className="text-blue-100 text-xs">
                Reçue à {new Date(sessionInvitation.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => handleAcceptInvitation(sessionInvitation)}
              disabled={isJoiningSession}
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              {isJoiningSession ? (
                <Clock className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Video className="h-4 w-4 mr-2" />
              )}
              {isJoiningSession ? 'Connexion...' : 'Rejoindre'}
            </Button>
            <Button
              onClick={handleDeclineInvitation}
              variant="outline"
              className="border-white text-white hover:bg-white/20"
            >
              <XCircle className="h-4 w-4 mr-2" /> Ignorer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}