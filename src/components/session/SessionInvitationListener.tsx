// src/components/session/SessionInvitationListener.tsx - VERSION CORRIGÉE POUR ABLY V2+ SANS BOUCLES
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAbly } from '@/hooks/useAbly';
import { getUserChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import type { RealtimeChannel, Message } from 'ably'; // ✅ Import direct
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
  const router = useRouter();
  const { toast } = useToast();
  
  const { client: ablyClient, isConnected: ablyConnected } = useAbly('SessionInvitationListener');
  
  const processedInvitationsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null); // ✅ Typé correctement
  const initializationStateRef = useRef({
    hasInitialized: false,
    hasCheckedPending: false,
    currentStudentId: ''
  });

  const handleInvitation = useCallback((data: SessionInvitation) => {
    if (!mountedRef.current) return;
    
    const invitationId = data.sessionId;
    
    if (processedInvitationsRef.current.has(invitationId)) {
      console.log(`🔄 [INVITE LISTENER] - Invitation ${invitationId} déjà traitée`);
      return;
    }
    
    console.log(`✅ [INVITE LISTENER] - Nouvelle invitation reçue: ${invitationId}`);
    processedInvitationsRef.current.add(invitationId);
    
    setSessionInvitation(data);
    
    toast({
      title: '🎯 Invitation de session reçue !',
      description: `${data.teacherName} vous invite à une session vidéo`,
      duration: 10000,
    });
  }, [toast]);

  const checkPendingInvitations = useCallback(async (currentStudentId: string) => {
    if (!currentStudentId || !mountedRef.current || initializationStateRef.current.hasCheckedPending) {
      return;
    }

    initializationStateRef.current.hasCheckedPending = true;
    
    try {
      console.log(`🔍 [INVITE LISTENER] - Vérification des invitations en attente pour: ${currentStudentId}`);
      const response = await fetch(`/api/session/pending-invitations?studentId=${currentStudentId}`);
      
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
      initializationStateRef.current.hasCheckedPending = false;
    }
  }, [handleInvitation]);

  useEffect(() => {
    mountedRef.current = true;
    let channel: RealtimeChannel | null = null; // ✅ Typé

    const initializeListener = async () => {
      const currentStudentId = studentId;
      if (!currentStudentId || !ablyClient || !ablyConnected || !mountedRef.current) {
        return;
      }

      if (initializationStateRef.current.hasInitialized && initializationStateRef.current.currentStudentId === currentStudentId) {
        console.log(`🔁 [INVITE LISTENER] - Déjà initialisé pour ${currentStudentId}`);
        return;
      }

      try {
        const channelName = getUserChannelName(currentStudentId);
        console.log(`📡 [INVITE LISTENER] - Configuration Ably: ${channelName}`);
        
        channel = ablyClient.channels.get(channelName);
        channelRef.current = channel;
        
        const invitationHandler = (message: Message) => { // ✅ Typé correctement
          if (mountedRef.current && message.name === AblyEvents.SESSION_INVITATION) {
            console.log(`📨 [INVITE LISTENER] - Invitation temps réel: ${message.data.sessionId}`);
            handleInvitation(message.data);
          }
        };
        
        if (channel.state !== 'attached' && channel.state !== 'attaching') {
          await channel.attach();
        }
        
        channel.subscribe(AblyEvents.SESSION_INVITATION, invitationHandler);
        
        initializationStateRef.current = {
          hasInitialized: true,
          hasCheckedPending: initializationStateRef.current.hasCheckedPending,
          currentStudentId
        };
        
        console.log(`✅ [INVITE LISTENER] - Abonnement réussi: ${channelName}`);
        
        if (!initializationStateRef.current.hasCheckedPending) {
          await checkPendingInvitations(currentStudentId);
        }
        
      } catch (error) {
        console.error('❌ [INVITE LISTENER] - Erreur configuration Ably:', error);
        initializationStateRef.current.hasInitialized = false;
      }
    };

    const timeoutId = setTimeout(initializeListener, 100);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      
      if (channel) {
        try {
          channel.unsubscribe();
          console.log(`🧹 [INVITE LISTENER] - Nettoyage canal Ably`);
        } catch (error) {
          console.warn('⚠️ [INVITE LISTENER] - Erreur lors du nettoyage:', error);
        }
        channelRef.current = null;
      }
    };
  }, [studentId, ablyClient, ablyConnected, checkPendingInvitations, handleInvitation]);

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
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      processedInvitationsRef.current.add(invitation.sessionId);
      
      if (mountedRef.current) {
        setSessionInvitation(null);
        
        toast({ 
          title: 'Connexion...', 
          description: 'Redirection vers la session vidéo...' 
        });
        
        console.log(`🔄 [INVITE LISTENER] - Navigation vers session: ${invitation.sessionId}`);
        
        setTimeout(() => {
          if (mountedRef.current) {
            router.push(`/session/${invitation.sessionId}`);
          }
        }, 500);
      }
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Erreur rejoindre session:', error);
      if (mountedRef.current) {
        toast({ 
          variant: 'destructive', 
          title: 'Erreur de connexion',
          description: 'Impossible de rejoindre la session. Veuillez réessayer.'
        });
        setIsJoiningSession(false);
      }
    }
  }, [toast, router, studentId]);

  const handleDeclineInvitation = useCallback(async () => {
    if (!mountedRef.current || !sessionInvitation) return;
    
    processedInvitationsRef.current.add(sessionInvitation.sessionId);
    
    try {
      await fetch('/api/session/decline-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionInvitation.sessionId,
          studentId: studentId
        })
      });
    } catch (error) {
      console.error('❌ [INVITE LISTENER] - Erreur refus invitation:', error);
    }
    
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