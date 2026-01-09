// src/hooks/session/useMediaManagement.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        frameRate: { ideal: 24 }
    },
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
};

const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
    video: { 
        frameRate: { ideal: 30 }
    },
    audio: true, // Permet de capturer l'audio du système/onglet
};

/**
 * Hook pour gérer les flux média locaux (caméra, micro, partage d'écran).
 */
export function useMediaManagement() {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(true);

    const isMountedRef = useRef(true);

    // Initialisation du flux de la caméra
    useEffect(() => {
        isMountedRef.current = true;
        
        const getMedia = async () => {
            setIsMediaLoading(true);
            try {
                const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
                if (isMountedRef.current) {
                    setLocalStream(stream);
                    setIsMediaReady(true);
                }
            } catch (error) {
                console.error("❌ [MEDIA] Erreur d'accès à la caméra/micro:", error);
                if (isMountedRef.current) {
                    setIsMediaReady(true); // Prêt, même sans stream
                }
            } finally {
                if (isMountedRef.current) {
                    setIsMediaLoading(false);
                }
            }
        };

        getMedia();

        return () => {
            isMountedRef.current = false;
            localStream?.getTracks().forEach(track => track.stop());
            screenStream?.getTracks().forEach(track => track.stop());
        };
    }, []); // Dépendances vides pour ne s'exécuter qu'une fois

    const toggleMute = useCallback(() => {
        if (!localStream) return;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (!localStream) return;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsVideoOff(prev => !prev);
    }, [localStream]);

    // ✅ NOUVELLE LOGIQUE POUR LE PARTAGE D'ÉCRAN
    const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
        if (isSharingScreen) return screenStream;
        
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
            if (isMountedRef.current) {
                // Écouter l'arrêt via le bouton natif du navigateur
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    if (isMountedRef.current) {
                        stopScreenShare();
                    }
                });
                setScreenStream(stream);
                setIsSharingScreen(true);
                return stream;
            }
            return null;
        } catch (error) {
            console.error("❌ [MEDIA] Erreur de partage d'écran:", error);
            if (isMountedRef.current) {
                setIsSharingScreen(false);
            }
            return null;
        }
    }, [isSharingScreen, screenStream]);

    const stopScreenShare = useCallback(() => {
        if (!isMountedRef.current) return;
        screenStream?.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        setIsSharingScreen(false);
    }, [screenStream]);


    return {
        localStream,
        screenStream,
        isSharingScreen,
        isMuted,
        isVideoOff,
        isMediaReady,
        isMediaLoading,
        toggleMute,
        toggleVideo,
        startScreenShare, // ✅ Exporter la fonction de démarrage
        stopScreenShare,  // ✅ Exporter la fonction d'arrêt
    };
}
