// src/hooks/useActivityTracker.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { trackStudentActivity } from '@/lib/actions/activity.actions';

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
const PING_INTERVAL = 30 * 1000; // 30 seconds
const INACTIVITY_THRESHOLD = 60 * 1000; // 1 minute

export function useActivityTracker(enabled: boolean) {
  const lastActivityTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleActivity = useCallback(() => {
    // console.log('🏃‍♂️ [Heartbeat] Activité détectée');
    lastActivityTimeRef.current = Date.now();
  }, []);

  const pingServer = useCallback(async () => {
    const now = Date.now();
    const isInactive = now - lastActivityTimeRef.current > INACTIVITY_THRESHOLD;

    if (document.visibilityState !== 'visible' || isInactive) {
      console.log(`🟡 [CLIENT - Heartbeat] Ping ignoré (Visible: ${document.visibilityState === 'visible'}, Inactif: ${isInactive})`);
      return;
    }
    
    console.log('💓 [CLIENT - Heartbeat] Émission du ping...');
    try {
      const result = await trackStudentActivity(PING_INTERVAL / 1000);
      console.log('✅ [CLIENT - Heartbeat] Effet du ping (Réponse serveur):', result);
    } catch (error) {
      console.error('❌ [CLIENT - Heartbeat] Échec de l\'émission du ping:', error);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        console.log('🛑 [Heartbeat Tracker] Tracker désactivé et intervalle nettoyé.');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, handleActivity));
      return;
    }

    console.log('🚀 [Heartbeat Tracker] Initialisation.');
    lastActivityTimeRef.current = Date.now();

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, handleActivity));
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 [Heartbeat Tracker] Onglet visible, réinitialisation du temps d\'activité.');
        lastActivityTimeRef.current = Date.now();
      } else {
        console.log('🙈 [Heartbeat Tracker] Onglet caché.');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(pingServer, PING_INTERVAL);
    console.log(`⏰ [Heartbeat Tracker] Intervalle de ping défini toutes les ${PING_INTERVAL / 1000} secondes.`);

    return () => {
      console.log('🧹 [Heartbeat Tracker] Nettoyage.');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, handleActivity, pingServer]);

}
