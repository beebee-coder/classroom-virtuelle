// src/components/session/StudentSessionView.tsx - VERSION COMPLÈTE CORRIGÉE
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Participant } from '@/components/Participant';
import { SessionParticipant, DocumentInHistory, Html5CanvasScene, ComprehensionLevel, WhiteboardOperation, Role, Quiz, QuizResponse, QuizResults } from '@/types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Loader2, File, Users, Video, VideoOff } from 'lucide-react';
import { StudentSessionControls } from './StudentSessionControls';
import { updateStudentSessionStatus } from '@/lib/actions/ably-session.actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { SessionTimer } from './SessionTimer';
import { DocumentViewer } from './DocumentViewer';
import { Button } from '../ui/button';
import React from 'react';
import { Html5Whiteboard } from '../Html5Whiteboard';
import { AnimatedCard } from './AnimatedCard';
import { useSession } from 'next-auth/react';
import { QuizView } from './quiz/QuizView';
import { trackStudentActivity } from '@/lib/actions/activity.actions';

interface StudentSessionViewProps {
    sessionId: string;
    localStream: MediaStream | null;
    spotlightedStream: MediaStream | null;
    spotlightedUser: SessionParticipant | null | undefined;
    isHandRaised: boolean;
    onToggleHandRaise: (isRaised: boolean) => void;
    onUnderstandingChange: (status: ComprehensionLevel) => void;
    onLeaveSession: () => void;
    currentUnderstanding: ComprehensionLevel;
    currentUserId: string;
    activeTool: string;
    documentUrl: string | null;
    whiteboardControllerId: string | null;
    timerTimeLeft: number;
    onWhiteboardEvent: (event: WhiteboardOperation[]) => void;
    whiteboardOperations: WhiteboardOperation[];
    flushWhiteboardOperations?: () => void;
    onlineMembersCount: number;
    isPresenceConnected: boolean;
    activeQuiz: Quiz | null;
    onSubmitQuizResponse: (response: QuizResponse) => Promise<{ success: boolean; }>;
    quizResults: QuizResults | null;
}

export function StudentSessionView({
    sessionId,
    localStream,
    spotlightedStream,
    spotlightedUser,
    isHandRaised,
    onToggleHandRaise,
    onUnderstandingChange,
    onLeaveSession,
    currentUnderstanding,
    currentUserId,
    activeTool,
    documentUrl,
    whiteboardControllerId,
    timerTimeLeft,
    onWhiteboardEvent,
    whiteboardOperations,
    flushWhiteboardOperations,
    onlineMembersCount,
    isPresenceConnected,
    activeQuiz,
    onSubmitQuizResponse,
    quizResults,
}: StudentSessionViewProps) {
    const { toast } = useToast();
    const { data: session } = useSession();

    const [isHandRaiseLoading, setIsHandRaiseLoading] = useState(false);
    const [isUnderstandingLoading, setIsUnderstandingLoading] = useState(false);
    
    // CORRECTION : Heartbeat avec gestion d'erreur robuste
    useEffect(() => {
        const ACTIVITY_INTERVAL_MS = 30000;
        
        const intervalId = setInterval(() => {
            trackStudentActivity(ACTIVITY_INTERVAL_MS / 1000)
                .then((result) => {
                    // CORRECTION : Validation du résultat
                    if (result && typeof result === 'object' && result.success) {
                        console.log(`✨ [HEARTBEAT] +${result.pointsAwarded || 1} points attribués.`);
                    } else if (result && typeof result.scores === 'object' && result.scores !== null) {
                        console.log('✅ [HEARTBEAT] - Résultat de quiz reçu via heartbeat');
                    } else {
                        console.warn('⚠️ [HEARTBEAT] - Réponse invalide ou sans action:', result);
                    }
                })
                .catch((error) => {
                    console.warn("⚠️ [HEARTBEAT] Échec du suivi d'activité:", error);
                });
        }, ACTIVITY_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [sessionId]);

    // CORRECTION : Handler lever/main avec validation
    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) return;
        
        const newHandRaiseState = !isHandRaised;
        setIsHandRaiseLoading(true);
        
        const previousHandRaiseState = isHandRaised;
        
        console.log(`✋ [STUDENT VIEW] - ${newHandRaiseState ? 'Lever' : 'Baisser'} la main`);
        
        // Mettre à jour l'état local immédiatement
        onToggleHandRaise(newHandRaiseState);
        
        try {
            await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: currentUnderstanding
            });
            console.log(`✅ [STUDENT VIEW] - Statut main mis à jour: ${newHandRaiseState}`);
        } catch (error) {
            console.error('❌ [STUDENT VIEW] - Erreur mise à jour statut main:', error);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de la main levée.'
            });
            // Revenir à l'état précédent en cas d'erreur
            onToggleHandRaise(previousHandRaiseState);
        } finally {
            setIsHandRaiseLoading(false);
        }
    }, [isHandRaiseLoading, isHandRaised, sessionId, currentUnderstanding, onToggleHandRaise, toast]);
    
    // CORRECTION : Handler compréhension avec validation
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading) return;
        
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        setIsUnderstandingLoading(true);
        
        const previousStatus = currentUnderstanding;
        
        console.log(`🧠 [STUDENT VIEW] - Changement compréhension: ${newStatus}`);
        
        onUnderstandingChange(newStatus);
        
        try {
            await updateStudentSessionStatus(sessionId, { 
                understanding: newStatus,
                isHandRaised
            });
            console.log(`✅ [STUDENT VIEW] - Statut compréhension mis à jour: ${newStatus}`);
        } catch (error) {
            console.error('❌ [STUDENT VIEW] - Erreur mise à jour compréhension:', error);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de compréhension.'
            });
            onUnderstandingChange(previousStatus);
        } finally {
            setIsUnderstandingLoading(false);
        }
    }, [isUnderstandingLoading, currentUnderstanding, sessionId, isHandRaised, onUnderstandingChange, toast]);

    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        console.log(`🎨 [STUDENT VIEW] - ${operations.length} opérations whiteboard`);
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        console.log(`🔄 [STUDENT VIEW] - Flush des opérations whiteboard`);
        if (flushWhiteboardOperations) {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    // CORRECTION : Fonctions de validation de stream améliorées
    const isStreamValid = useCallback((stream: MediaStream | null): boolean => {
        if (!stream) {
            console.log(`📹 [STREAM VALIDATION] - Stream null`);
            return false;
        }
        if (!stream.active) {
            console.log(`📹 [STREAM VALIDATION] - Stream inactif`);
            return false;
        }
        
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        
        const hasValidVideoTracks = videoTracks.some(track => track.readyState === 'live');
        const hasValidAudioTracks = audioTracks.some(track => track.readyState === 'live');
        
        const isValid = hasValidVideoTracks || hasValidAudioTracks;
        console.log(`📹 [STREAM VALIDATION] - Stream valide: ${isValid}, vidéo: ${hasValidVideoTracks}, audio: ${hasValidAudioTracks}`);
        
        return isValid;
    }, []);

    // CORRECTION FINALE : Fonction canDisplayVideo améliorée avec vérification complète
    const canDisplayVideo = useCallback((stream: MediaStream | null): boolean => {
        if (!stream || !stream.active) {
            console.log(`📹 [VIDEO DISPLAY] - Stream null ou inactif`);
            return false;
        }
        
        const videoTracks = stream.getVideoTracks();
        
        // CORRECTION : Vérification complète de l'état des tracks vidéo
        const hasVideo = videoTracks.some(track => {
            const isLive = track.readyState === 'live';
            const isEnabled = track.enabled;
            const isNotMuted = !track.muted;
            const hasConstraints = track.getConstraints() !== {};
            
            console.log(`📹 [VIDEO TRACK] - ready: ${isLive}, enabled: ${isEnabled}, muted: ${track.muted}, constraints:`, track.getConstraints());
            
            return isLive && isEnabled && isNotMuted && hasConstraints;
        });
        
        console.log(`📹 [VIDEO DISPLAY] - Peut afficher vidéo: ${hasVideo}, tracks: ${videoTracks.length}`);
        return hasVideo;
    }, []);

    // CORRECTION : Fonction de rendu du contenu principal avec logs
    const renderMainContent = useCallback(() => {
        console.log(`🎯 [STUDENT VIEW] - Rendu contenu principal, outil: ${activeTool}, spotlightUser: ${spotlightedUser?.id}, streamValide: ${isStreamValid(spotlightedStream)}`);
        
        switch(activeTool) {
            case 'document':
                console.log(`📄 [STUDENT VIEW] - Affichage document: ${documentUrl}`);
                return <DocumentViewer url={documentUrl} />;
                
            case 'whiteboard':
                console.log(`🎨 [STUDENT VIEW] - Affichage whiteboard, contrôleur: ${whiteboardControllerId}`);
                return (
                    <div className="h-full w-full relative">
                        <div className={`absolute top-2 left-2 z-10 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isPresenceConnected 
                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                            {isPresenceConnected 
                                ? `✅ Connecté (${onlineMembersCount} en ligne)` 
                                : '⏳ Connexion...'
                            }
                        </div>
                        
                        <Html5Whiteboard
                            sessionId={sessionId}
                            userId={currentUserId}
                            isController={currentUserId === whiteboardControllerId}
                            operations={whiteboardOperations}
                            onEvent={handleWhiteboardEvent}
                            flushOperations={handleFlushWhiteboardOperations}
                        />
                    </div>
                );
                
            case 'quiz':
                console.log(`❓ [STUDENT VIEW] - Affichage quiz: ${activeQuiz?.id}`);
                return (
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <QuizView
                            quiz={activeQuiz!}
                            isTeacherView={false}
                            onSubmitResponse={onSubmitQuizResponse}
                            results={quizResults}
                        />
                    </div>
                );
                
            case 'camera':
            default:
                const hasValidSpotlightedStream = isStreamValid(spotlightedStream);
                const canDisplaySpotlightedVideo = canDisplayVideo(spotlightedStream);

                console.log(`📹 [STUDENT VIEW] - Mode camera, spotlight: ${hasValidSpotlightedStream}, video: ${canDisplaySpotlightedVideo}`);

                if (hasValidSpotlightedStream) {
                    return (
                        <div className="w-full h-full relative bg-black">
                            <div className="absolute top-3 right-3 z-10">
                                <div className="bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
                                    <Video className="h-3 w-3" />
                                    <span>
                                        {spotlightedUser ? `En direct - ${spotlightedUser.name}` : 'En direct - Professeur'}
                                    </span>
                                    {!canDisplaySpotlightedVideo && (
                                        <span className="text-orange-300">(Audio seulement)</span>
                                    )}
                                </div>
                            </div>
                            
                            <Participant 
                                stream={spotlightedStream}
                                isLocal={false} 
                                isSpotlighted={true}
                                isTeacher={spotlightedUser?.role === Role.PROFESSEUR || !spotlightedUser}
                                participantUserId={spotlightedUser?.id ?? 'professor'}
                                displayName={spotlightedUser?.name ?? 'Professeur'}
                                isHandRaised={isHandRaised}
                            />
                        </div>
                    );
                }

                // CORRECTION : Affichage d'attente amélioré
                return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <div className="flex flex-col items-center gap-3">
                                <VideoOff className="h-12 w-12 mx-auto text-orange-500" />
                                <div>
                                    <h3 className="font-semibold text-xl mb-2">
                                        {spotlightedUser ? `${spotlightedUser.name} se connecte` : 'En attente du professeur...'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {spotlightedUser ? 'Connexion vidéo en cours...' : 'Le professeur rejoindra bientôt la session'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-orange-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Établissement de la connexion WebRTC</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                    {spotlightedUser?.id ? `ID: ${spotlightedUser.id}` : 'En attente...'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    }, [
        activeTool, documentUrl, whiteboardControllerId, currentUserId, whiteboardOperations,
        spotlightedUser, spotlightedStream, isHandRaised, sessionId, isPresenceConnected,
        onlineMembersCount, handleWhiteboardEvent, handleFlushWhiteboardOperations,
        isStreamValid, canDisplayVideo, localStream, activeQuiz, onSubmitQuizResponse, quizResults
    ]);
    
    const mainContent = useMemo(() => renderMainContent(), [renderMainContent]);
    
    return (
        <div className="flex flex-row flex-1 min-h-0 gap-4">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full h-full relative rounded-lg overflow-hidden border bg-black">
                    {mainContent}
                </div>
            </div>

            <div className="w-60 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                             {/* CORRECTION : Affichage conditionnel du spotlight dans la sidebar */}
                             {activeTool !== 'camera' && isStreamValid(spotlightedStream) && (
                                <AnimatedCard title={spotlightedUser?.name || "Professeur"}>
                                    <div className="p-2">
                                         <Participant
                                            stream={spotlightedStream}
                                            isLocal={false} 
                                            isSpotlighted={false}
                                            isTeacher={spotlightedUser?.role === Role.PROFESSEUR || !spotlightedUser}
                                            participantUserId={spotlightedUser?.id ?? 'professor'}
                                            displayName={spotlightedUser?.name || "Professeur"}
                                        />
                                    </div>
                                </AnimatedCard>
                             )}
                             
                             {/* CORRECTION : Affichage de la vidéo locale */}
                             <AnimatedCard title="Ma Vidéo">
                                <div className="p-2">
                                    {isStreamValid(localStream) ? (
                                        <Participant
                                            stream={localStream}
                                            isLocal={true}
                                            isTeacher={false}
                                            participantUserId={currentUserId}
                                            displayName="Vous"
                                            isHandRaised={isHandRaised}
                                            isWhiteboardController={currentUserId === whiteboardControllerId}
                                        />
                                    ) : (
                                        <div className="text-center text-muted-foreground p-4 aspect-video flex flex-col items-center justify-center border border-dashed rounded-lg">
                                            <VideoOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <p className="text-sm">Caméra non disponible</p>
                                        </div>
                                    )}
                                </div>
                            </AnimatedCard>
                             
                             {/* CORRECTION : Minuteur */}
                             <AnimatedCard title="Minuteur">
                                 <SessionTimer
                                    isTeacher={false}
                                    sessionId={sessionId}
                                    timeLeft={timerTimeLeft}
                                    isTimerRunning={false}
                                    initialDuration={0}
                                    onStart={() => {}}
                                    onPause={() => {}}
                                    onReset={() => {}}
                                />
                             </AnimatedCard>
                             
                             {/* CORRECTION : Contrôles étudiants */}
                             <AnimatedCard title="Mes Outils">
                                 <StudentSessionControls
                                    isHandRaised={isHandRaised}
                                    onRaiseHand={handleToggleHandRaise}
                                    onComprehensionUpdate={handleUnderstandingUpdate}
                                    currentComprehension={currentUnderstanding}
                                    isLoading={isHandRaiseLoading || isUnderstandingLoading}
                                />
                            </AnimatedCard>
                            
                            {/* CORRECTION : Statut whiteboard */}
                            {activeTool === 'whiteboard' && (
                                <AnimatedCard title="Contrôle Tableau">
                                    <div className="p-2 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                            currentUserId === whiteboardControllerId 
                                                ? 'bg-green-100 text-green-800 border border-green-200' 
                                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                                        }`}>
                                            {currentUserId === whiteboardControllerId 
                                                ? '✅ Vous contrôlez le tableau' 
                                                : '👀 Vous visualisez seulement'
                                            }
                                        </div>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            {whiteboardOperations.length} opérations chargées
                                        </div>
                                    </div>
                                </AnimatedCard>
                            )}
                        </div>
                    </ScrollArea>
                </motion.div>
            </div>
        </div>
    );
}
