// src/components/SessionInvitationListener.tsx - VERSION CORRIGÉE AVEC useAbly()
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAbly } from '@/hooks/useAbly'; // CORRECTION: utiliser useAbly au lieu de useAblyWithSession
import { getUserChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import type { Types as AblyTypes } from 'ably';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, XCircle, Clock, X, RefreshCw } from 'lucide-react';

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
  
  // CORRECTION: Utiliser useAbly() au lieu de useAblyWithSession()
  const { client: ablyClient, isConnected: ablyConnected, connectionState } = useAbly();
  const ablyLoading = connectionState === 'initialized' || connectionState === 'connecting';
  
  // CORRECTION: Types Ably corrects
  const processedInvitationsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<AblyTypes.RealtimeChannelCallbacks | null>(null);
  const messageListenerRef = useRef<AblyTypes.messageCallback<AblyTypes.Message> | null>(null);
  const mountedRef = useRef(true);
  const setupAttemptedRef = useRef(false);

  // CORRECTION: Gestion robuste des nouvelles invitations
  const handleInvitation = useCallback((data: SessionInvitation) => {
    if (!mountedRef.current || processedInvitationsRef.current.has(data.sessionId)) {
      console.log(`🔄 [INVITE LISTENER] - Invitation ${data.sessionId} already processed or component unmounted`);
      return;
    }
    
    console.log(`✅ [INVITE LISTENER] - New invitation received: ${data.sessionId}`);
    processedInvitationsRef.current.add(data.sessionId);
    
    if (mountedRef.current) {
      setSessionInvitation(data);
      
      toast({
        title: '🎯 Invitation de session reçue !',
        description: `${data.teacherName} vous invite à une session vidéo`,
        duration: 10000,
      });
    }
  }, [toast]);

  // CORRECTION: Fonction pour vérifier les invitations en attente avec gestion d'erreur améliorée
  const checkPendingInvitations = useCallback(async () => {
    if (!studentId || !mountedRef.current) return;
    
    setIsCheckingPending(true);
    try {
      console.log(`🔍 [INVITE LISTENER] - Checking pending invitations for student: ${studentId}`);
      const response = await fetch(`/api/session/pending-invitations?studentId=${studentId}`);
      
      if (!mountedRef.current) return;
      
      if (response.ok) {
        const pendingSessions = await response.json();
        console.log(`📥 [INVITE LISTENER] - Found ${pendingSessions.length} pending sessions`);
        
        if (pendingSessions.length > 0) {
            // CORRECTION: Utiliser le bon champ pour trier et construire l'invitation
            const latestSession = pendingSessions.sort((a: any, b: any) => 
              new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime()
            )[0];
            
            if (latestSession && !processedInvitationsRef.current.has(latestSession.id)) {
              const invitation: SessionInvitation = {
                sessionId: latestSession.data.sessionId,
                teacherId: latestSession.data.teacherId,
                classroomId: latestSession.data.classroomId,
                classroomName: latestSession.data.classroomName || 'Classe',
                teacherName: latestSession.data.teacherName || 'Professeur',
                timestamp: latestSession.data.timestamp,
                type: 'session-invitation'
              };
              
              handleInvitation(invitation);
            }
        }
      } else {
        console.error(`❌ [INVITE LISTENER] - Failed to fetch pending invitations: ${response.status}`);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('❌ [INVITE LISTENER] - Failed to fetch pending invitations', error);
      }
    } finally {
      if (mountedRef.current) {
        setIsCheckingPending(false);
      }
    }
  }, [studentId, handleInvitation]);

  // CORRECTION: Gestion améliorée de l'acceptation d'invitation
  const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
    if (!mountedRef.current) return;
    
    setIsJoiningSession(true);
    
    try {
      console.log(`🎯 [INVITE LISTENER] - Accepting invitation: ${invitation.sessionId}`);
      
      // Notifier le serveur que l'élève rejoint
      const response = await fetch('/api/session/student-joined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: invitation.sessionId,
          studentId: studentId
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      processedInvitationsRef.current.add(invitation.sessionId);
      
      if (mountedRef.current) {
        setSessionInvitation(null);
        toast({ 
          title: 'Connexion...', 
          description: 'Rejoindre la session vidéo en cours...' 
        });
        router.push(`/session/${invitation.sessionId}`);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('❌ [INVITE LISTENER] - Error joining session:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Erreur de connexion',
          description: 'Impossible de rejoindre la session. Veuillez réessayer.'
        });
        setIsJoiningSession(false);
      }
    }
  }, [router, toast, studentId]);

  // CORRECTION: Gestion du refus d'invitation
  const handleDeclineInvitation = useCallback(() => {
    if (!mountedRef.current || !sessionInvitation) return;
    
    const invitationId = sessionInvitation.sessionId;
    processedInvitationsRef.current.add(invitationId);
    
    // Optionnel: Notifier le serveur du refus
    fetch('/api/session/decline-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: invitationId,
        studentId: studentId
      })
    }).catch(error => {
      console.error('❌ [INVITE LISTENER] - Error declining invitation:', error);
    });
    
    if (mountedRef.current) {
      setSessionInvitation(null);
      toast({ title: 'Invitation refusée' });
    }
  }, [toast, sessionInvitation, studentId]);

  // CORRECTION: Fermeture simple de l'invitation
  const handleCloseInvitation = useCallback(() => {
    if (mountedRef.current) {
      setSessionInvitation(null);
    }
  }, []);
  

  // CORRECTION: Setup Ably avec gestion robuste des états
  const setupAblySubscription = useCallback(async () => {
    if (!studentId || !ablyClient || !ablyConnected || !mountedRef.current) {
      return;
    }

    // CORRECTION: Éviter les setups multiples
    if (setupAttemptedRef.current && channelRef.current) {
      console.log(`⏭️ [INVITE LISTENER] - Ably setup already completed, skipping`);
      return;
    }

    try {
      const channelName = getUserChannelName(studentId);
      console.log(`📡 [INVITE LISTENER] - Setting up Ably subscription for channel: ${channelName}`);
      
      const channel = ablyClient.channels.get(channelName);
      channelRef.current = channel;
      
      // CORRECTION: S'assurer que le canal est attaché
      if (channel.state !== 'attached') {
        await channel.attach();
      }
      
      // CORRECTION: Stocker la référence du listener pour un nettoyage propre
      const messageListener: AblyTypes.messageCallback<AblyTypes.Message> = (message: AblyTypes.Message) => {
        if (mountedRef.current && message.name === AblyEvents.SESSION_INVITATION) {
          console.log(`📨 [INVITE LISTENER] - Real-time invitation: ${message.data.sessionId}`);
          handleInvitation(message.data);
        }
      };
      
      messageListenerRef.current = messageListener;
      channel.subscribe(AblyEvents.SESSION_INVITATION, messageListener);
      
      setupAttemptedRef.current = true;
      console.log(`✅ [INVITE LISTENER] - Successfully subscribed to invitation channel: ${channelName}`);
      
    } catch (error) {
      if (mountedRef.current) {
        console.error('❌ [INVITE LISTENER] - Failed to setup Ably subscription', error);
        setupAttemptedRef.current = false;
      }
    }
  }, [studentId, ablyClient, ablyConnected, handleInvitation]);

  // CORRECTION: Effet principal avec gestion robuste du cycle de vie
  useEffect(() => {
    mountedRef.current = true;
    
    const initialize = async () => {
      if (!studentId || ablyLoading || !mountedRef.current) {
        return;
      }

      // Vérifier les invitations en attente au montage
      await checkPendingInvitations();

      // Configurer l'abonnement Ably si connecté
      if (ablyConnected) {
        await setupAblySubscription();
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      setupAttemptedRef.current = false;
      
      console.log(`🧹 [INVITE LISTENER] - Cleaning up Ably subscriptions`);
      
      // CORRECTION: Nettoyage complet et sécurisé
      if (channelRef.current && messageListenerRef.current) {
        try {
          channelRef.current.unsubscribe(AblyEvents.SESSION_INVITATION, messageListenerRef.current);
          messageListenerRef.current = null;
          channelRef.current = null;
        } catch (error) {
          console.error('❌ [INVITE LISTENER] - Error during cleanup', error);
        }
      }
    };
  }, [studentId, ablyLoading, ablyConnected, checkPendingInvitations, setupAblySubscription]);

  // CORRECTION: Reconnexion automatique améliorée
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (ablyConnected && studentId && !sessionInvitation && !setupAttemptedRef.current) {
      console.log(`🔄 [INVITE LISTENER] - Ably reconnected, reinitializing`);
      setupAblySubscription();
      checkPendingInvitations();
    }
  }, [ablyConnected, studentId, sessionInvitation, setupAblySubscription, checkPendingInvitations]);

  // CORRECTION: Ne rien rendre si aucune invitation
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
                Reçue le {new Date(sessionInvitation.timestamp).toLocaleTimeString()}
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
