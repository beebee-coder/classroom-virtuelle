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

/**
 * Crée un flux audio/vidéo silencieux et factice.
 * @returns Une MediaStream contenant une piste vidéo noire et une piste audio silencieuse.
 */
const createSilentStream = (): MediaStream => {
    // Vidéo noire
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const videoStream = canvas.captureStream(30); // 30 FPS

    // Audio silencieux
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const dst = audioContext.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.frequency.setValueAtTime(0, audioContext.currentTime); // Fréquence nulle = silence
    oscillator.start();
    
    // Arrêter proprement l'oscillateur après un court délai pour éviter les fuites
    setTimeout(() => {
        try { oscillator.stop(); } catch (e) { /* ignore */ }
    }, 100);

    const audioStream = dst.stream;

    const combinedStream = new MediaStream([
        ...videoStream.getTracks(),
        ...audioStream.getTracks()
    ]);

    // Désactiver les pistes par défaut (l'utilisateur n'émet rien)
    combinedStream.getVideoTracks().forEach(track => track.enabled = false);
    combinedStream.getAudioTracks().forEach(track => track.enabled = false);

    return combinedStream;
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
    const screenStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        
        const timeoutId = setTimeout(() => {
            if (isMountedRef.current && isMediaLoading) {
                console.warn('⚠️ [MEDIA] Timeout déclenché après 5s, création d’un flux factice.');
                const silentStream = createSilentStream();
                localStreamRef.current = silentStream;
                setLocalStream(silentStream);
                setIsVideoOff(true);
                setIsMuted(true);
                setIsMediaReady(true);
                setIsMediaLoading(false);
            }
        }, 5000); // ⏱️ Timeout de sécurité
    
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
                if (isMountedRef.current) {
                    clearTimeout(timeoutId); // ✅ Annuler le timeout si succès
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setIsMediaReady(true);
                }
            } catch (error) {
                console.error("❌ [MEDIA] Erreur d'accès à la caméra/micro:", error);
                if (isMountedRef.current) {
                    clearTimeout(timeoutId); // ✅ Annuler le timeout si erreur
                    const silentStream = createSilentStream();
                    localStreamRef.current = silentStream;
                    setLocalStream(silentStream);
                    setIsVideoOff(true);
                    setIsMuted(true);
                    setIsMediaReady(true);
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
            clearTimeout(timeoutId);
            localStreamRef.current?.getTracks().forEach(track => track.stop());
            screenStream?.getTracks().forEach(track => track.stop());
        };
    }, []);

    // Initialisation du flux local (caméra/micro)
    useEffect(() => {
        const getMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
                if (isMountedRef.current && stream) {
                    localStreamRef.current = stream;
                    setLocalStream(stream);
                    setIsMediaReady(true);
                }
            } catch (error: any) {
                console.error("❌ [MEDIA] Erreur d'accès à la caméra/micro:", error);
                // Vérifier si l'erreur est liée à l'absence de device ou refus de permission
                const isNoDevice = error.name === 'NotFoundError';
                const isPermissionDenied = error.name === 'NotAllowedError';

                if (isMountedRef.current) {
                    // ✅ Toujours créer un flux factice pour permettre la réception WebRTC
                    const silentStream = createSilentStream();
                    localStreamRef.current = silentStream;
                    setLocalStream(silentStream);
                    setIsVideoOff(true);
                    setIsMuted(true);
                    setIsMediaReady(true); // ✅ Critique : ne pas bloquer WebRTC
                }
            } finally {
                if (isMountedRef.current) {
                    setIsMediaLoading(false);
                }
            }
        };

        getMedia();
    }, []); // 🔥 Supprimé screenStream de la dépendance → évite les cycles

    // Gestion de l'arrêt du partage d'écran
    useEffect(() => {
        if (!screenStream) return;

        screenStreamRef.current = screenStream;

        const handleTrackEnded = () => {
            if (isMountedRef.current) {
                setIsSharingScreen(false);
                setScreenStream(null);
                screenStreamRef.current = null;
            }
        };

        const tracks = screenStream.getTracks();
        tracks.forEach(track => track.addEventListener('ended', handleTrackEnded));

        return () => {
            tracks.forEach(track => track.removeEventListener('ended', handleTrackEnded));
        };
    }, [screenStream]);

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;
        const tracks = localStreamRef.current.getAudioTracks();
        if (tracks.length > 0) {
            const enabled = !tracks[0].enabled;
            tracks.forEach(track => track.enabled = enabled);
            setIsMuted(!enabled);
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return;
        const tracks = localStreamRef.current.getVideoTracks();
        if (tracks.length > 0) {
            const enabled = !tracks[0].enabled;
            tracks.forEach(track => track.enabled = enabled);
            setIsVideoOff(!enabled);
        }
    }, []);

    const toggleScreenShare = useCallback(async () => {
        if (isSharingScreen) {
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
            setScreenStream(null);
            setIsSharingScreen(false);
            screenStreamRef.current = null;
        } else {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
                if (isMountedRef.current) {
                    setScreenStream(stream);
                    setIsSharingScreen(true);
                    screenStreamRef.current = stream;
                }
            } catch (error) {
                console.error("❌ [MEDIA] Erreur de partage d'écran:", error);
            }
        }
    }, [isSharingScreen]);

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