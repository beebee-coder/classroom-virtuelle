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
 * Crée un flux audio/vidéo silencieux mais fonctionnel pour WebRTC.
 * C'est essentiel pour les participants sans caméra/micro.
 * @returns Une MediaStream avec une piste vidéo noire et une piste audio silencieuse.
 */
const createSilentStream = (): MediaStream => {
    // Vidéo noire
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 1, 1);
    }
    const videoStream = canvas.captureStream(1); // 1 FPS, suffisant pour une piste noire
    const videoTrack = videoStream.getVideoTracks()[0];
    videoTrack.enabled = true; // Crucial : la piste doit être activée

    // Audio silencieux
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    const audioTrack = destination.stream.getAudioTracks()[0];
    audioTrack.enabled = true; // Crucial : la piste doit être activée

    const combinedStream = new MediaStream([videoTrack, audioTrack]);
    console.log("Blank stream created", combinedStream.getTracks());
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

    // Effet pour initialiser les médias au montage
    useEffect(() => {
        isMountedRef.current = true;
        
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
                
                // CRUCIAL : Fournir un flux factice en cas d'échec
                if (isMountedRef.current) {
                    const silentStream = createSilentStream();
                    localStreamRef.current = silentStream;
                    setLocalStream(silentStream);
                    setIsVideoOff(true); // Caméra considérée comme "off"
                    setIsMuted(true);     // Micro considéré comme "off"
                    setIsMediaReady(true); // ✅ La clé : on est "prêt" pour le WebRTC même sans média réel
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
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Gestion de l'arrêt du partage d'écran par le navigateur
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
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        });
    }, []);

    const toggleVideo = useCallback(() => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsVideoOff(!track.enabled);
        });
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
