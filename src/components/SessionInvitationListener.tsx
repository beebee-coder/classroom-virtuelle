// src/components/SessionInvitationListener.tsx - VERSION AMÉLIORÉE
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAblyWithSession } from '@/hooks/useAblyWithSession';
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
  const { client: ablyClient, isConnected: ablyConnected, isLoading: ablyLoading } = useAblyWithSession();
  const processedInvitationsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<AblyTypes.RealtimeChannelCallbacks | null>(null);

  // Fonction pour vérifier les invitations en attente
  const checkPendingInvitations = useCallback(async () => {
    if (!studentId) return;
    
    setIsCheckingPending(true);
    try {
      const response = await fetch(`/api/session/pending-invitations?studentId=${studentId}`);
      if (response.ok) {
        const pendingSessions = await response.json();
        console.log(`📥 [INVITE LISTENER] - Found ${pendingSessions.length} pending sessions`);
        
        // Prendre la session la plus récente
        const latestSession = pendingSessions.sort((a: any, b: any) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )[0];
        
        if (latestSession && !processedInvitationsRef.current.has(latestSession.id)) {
          const invitation: SessionInvitation = {
            sessionId: latestSession.id,
            teacherId: latestSession.teacherId,
            classroomId: latestSession.classroomId,
            classroomName: latestSession.classroomName || 'Classe',
            teacherName: latestSession.teacherName || 'Professeur',
            timestamp: latestSession.startTime,
            type: 'session-invitation'
          };
          
          handleInvitation(invitation);
        }
      }
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Failed to fetch pending invitations', error);
    } finally {
      setIsCheckingPending(false);
    }
  }, [studentId]);

  const handleAcceptInvitation = useCallback(async (invitation: SessionInvitation) => {
    setIsJoiningSession(true);
    
    try {
      // Notifier le serveur que l'élève rejoint
      await fetch('/api/session/student-joined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: invitation.sessionId,
          studentId: studentId
        })
      });
      
      processedInvitationsRef.current.add(invitation.sessionId);
      setSessionInvitation(null);
      toast({ title: 'Connexion...', description: 'Rejoindre la session vidéo en cours...' });
      router.push(`/session/${invitation.sessionId}`);
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Error joining session:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur de connexion',
        description: 'Impossible de rejoindre la session'
      });
      setIsJoiningSession(false);
    }
  }, [router, toast, studentId]);

  const handleDeclineInvitation = useCallback(() => {
    if (sessionInvitation) {
      processedInvitationsRef.current.add(sessionInvitation.sessionId);
      
      // Optionnel: Notifier le serveur du refus
      fetch('/api/session/decline-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionInvitation.sessionId,
          studentId: studentId
        })
      }).catch(console.error);
    }
    setSessionInvitation(null);
    toast({ title: 'Invitation refusée' });
  }, [toast, sessionInvitation, studentId]);

  const handleCloseInvitation = useCallback(() => {
    setSessionInvitation(null);
  }, []);
  
  const handleInvitation = useCallback((data: SessionInvitation) => {
    if (processedInvitationsRef.current.has(data.sessionId)) {
      console.log(`🔄 [INVITE LISTENER] - Invitation ${data.sessionId} already processed`);
      return;
    }
    
    setSessionInvitation(data);
    processedInvitationsRef.current.add(data.sessionId);
    
    toast({
      title: '🎯 Invitation de session reçue !',
      description: `${data.teacherName} vous invite à une session vidéo`,
      duration: 10000,
    });
    
    console.log(`✅ [INVITE LISTENER] - New invitation received: ${data.sessionId}`);
  }, [toast]);

  // Effet principal pour la gestion des abonnements
  useEffect(() => {
    if (!studentId || !ablyClient || ablyLoading) {
      return;
    }

    let isMounted = true;

    const setupSubscriptions = async () => {
      // Vérifier les invitations en attente au montage
      await checkPendingInvitations();

      if (isMounted && ablyClient && ablyConnected) {
        try {
          const channelName = getUserChannelName(studentId);
          const channel = ablyClient.channels.get(channelName);
          channelRef.current = channel;
          
          // S'abonner aux nouvelles invitations en temps réel
          channel.subscribe(AblyEvents.SESSION_INVITATION, (message: AblyTypes.Message) => {
            if (isMounted) {
              console.log(`📨 [INVITE LISTENER] - Real-time invitation: ${message.data.sessionId}`);
              handleInvitation(message.data);
            }
          });
          
          console.log(`✅ [INVITE LISTENER] - Subscribed to invitation channel: ${channelName}`);
        } catch (error) {
          console.error('❌ [INVITE LISTENER] - Failed to subscribe to Ably channel', error);
        }
      }
    };

    setupSubscriptions();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        } catch (error) {
          console.error('❌ [INVITE LISTENER] - Error unsubscribing from channel', error);
        }
      }
    };
  }, [studentId, ablyClient, ablyConnected, ablyLoading, handleInvitation, checkPendingInvitations]);

  // Réessayer de vérifier les invitations si la connexion Ably change
  useEffect(() => {
    if (ablyConnected && studentId && !sessionInvitation) {
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
