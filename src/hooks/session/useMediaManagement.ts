// src/hooks/session/useMediaManagement.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
    },
};

const SCREEN_CONSTRAINTS: DisplayMediaStreamOptions = {
    video: { 
        frameRate: 30,
    },
    audio: true,
};

export function useMediaManagement() {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [isSharingScreen, setIsSharingScreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMediaReady, setIsMediaReady] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(true);

    const isMountedRef = useRef(true);
    const localStreamRef = useRef<MediaStream | null>(null);

    // Initialisation des médias
    useEffect(() => {
        isMountedRef.current = true;
        
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
                if (isMountedRef.current) {
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setIsMediaReady(true);
                }
            } catch (error) {
                console.error("❌ [MEDIA] Erreur d'accès à la caméra/micro:", error);
                if (isMountedRef.current) {
                    setIsMediaReady(true); // Prêt, mais sans stream
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
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            screenStream?.getTracks().forEach(track => track.stop());
        };
    }, [screenStream]); // Dépendance à screenStream pour nettoyer

    // Gestion de l'arrêt du partage d'écran via le navigateur
    useEffect(() => {
        if (!screenStream) return;

        const handleTrackEnded = () => {
            if (isMountedRef.current) {
                setIsSharingScreen(false);
                setScreenStream(null);
            }
        };

        screenStream.getTracks().forEach(track => track.addEventListener('ended', handleTrackEnded));
        return () => screenStream.getTracks().forEach(track => track.removeEventListener('ended', handleTrackEnded));
    }, [screenStream]);

    const toggleMute = useCallback(() => {
        // CORRECTION: Utiliser la référence pour s'assurer de modifier le bon flux
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    }, []);

    const toggleVideo = useCallback(() => {
        // CORRECTION: Utiliser la référence pour s'assurer de modifier le bon flux
        if (!localStreamRef.current) return;
        localStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsVideoOff(prev => !prev);
    }, []);

    const toggleScreenShare = useCallback(async () => {
        if (isSharingScreen) {
            // Arrêter le partage
            screenStream?.getTracks().forEach(track => track.stop());
            setScreenStream(null);
            setIsSharingScreen(false);
        } else {
            // Démarrer le partage
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
                if (isMountedRef.current) {
                    setScreenStream(stream);
                    setIsSharingScreen(true);
                }
            } catch (error) {
                console.error("❌ [MEDIA] Erreur de partage d'écran:", error);
            }
        }
    }, [isSharingScreen, screenStream]);

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
        toggleScreenShare,
    };
}
