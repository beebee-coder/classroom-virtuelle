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
import { trackStudentActivity } from '@/lib/actions/activity.actions'; // Ajout de l'import

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
    
    // ✅ GAMIFICATION: Suivi de l'activité de l'élève
    useEffect(() => {
        const ACTIVITY_INTERVAL_MS = 30000; // Envoyer un ping toutes les 30 secondes
        
        console.log(`💓 [HEARTBEAT] Démarrage du suivi d'activité pour la session ${sessionId}`);

        const intervalId = setInterval(() => {
            trackStudentActivity(ACTIVITY_INTERVAL_MS / 1000)
                .then((result: { success: boolean; pointsAwarded: number; }) => {
                    if (result.success) {
                        console.log(`✨ [HEARTBEAT] +${result.pointsAwarded} points attribués.`);
                    }
                })
                .catch((error: Error) => {
                    console.warn("⚠️ [HEARTBEAT] Échec du suivi d'activité:", error);
                });
        }, ACTIVITY_INTERVAL_MS);

        return () => {
            console.log(`🛑 [HEARTBEAT] Arrêt du suivi d'activité pour la session ${sessionId}`);
            clearInterval(intervalId);
        };
    }, [sessionId]);


    // ✅ CORRECTION : Logs détaillés pour le debugging des streams
    useEffect(() => {
        console.log(`🎯 [STUDENT VIEW] - Active tool: ${activeTool}, Whiteboard operations: ${whiteboardOperations.length}`);
        console.log(`🎯 [STUDENT VIEW] - Whiteboard controller: ${whiteboardControllerId}, Current user: ${currentUserId}`);
        console.log(`📹 [STUDENT VIEW] - Spotlighted stream:`, { 
            hasStream: !!spotlightedStream,
            streamActive: spotlightedStream?.active,
            tracks: spotlightedStream?.getTracks().length,
            user: spotlightedUser?.name
        });
        console.log(`📹 [STUDENT VIEW] - Local stream:`, {
            hasStream: !!localStream,
            streamActive: localStream?.active,
            tracks: localStream?.getTracks().length
        });
        
        if (activeTool === 'whiteboard' && whiteboardOperations.length > 0) {
            console.log(`🎯 [STUDENT VIEW] - Last operation:`, whiteboardOperations[whiteboardOperations.length - 1]);
        }
    }, [activeTool, whiteboardOperations, whiteboardControllerId, currentUserId, spotlightedStream, spotlightedUser, localStream]);

    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) return;
        
        const newHandRaiseState = !isHandRaised;
        setIsHandRaiseLoading(true);
        
        const previousHandRaiseState = isHandRaised;
        
        onToggleHandRaise(newHandRaiseState);
        
        try {
            await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: currentUnderstanding
            });
        } catch (error) {
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de la main levée.'
            });
            onToggleHandRaise(previousHandRaiseState);
        } finally {
            setIsHandRaiseLoading(false);
        }
    }, [isHandRaiseLoading, isHandRaised, sessionId, currentUnderstanding, onToggleHandRaise, toast]);
    
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading) return;
        
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        setIsUnderstandingLoading(true);
        
        const previousStatus = currentUnderstanding;
        
        console.log(`🤔 [ACTION DISPATCH] - Clic pour statut de compréhension: ${newStatus}`);
        onUnderstandingChange(newStatus);
        
        try {
            await updateStudentSessionStatus(sessionId, { 
                understanding: newStatus,
                isHandRaised
            });
        } catch (error) {
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

    // CORRECTION: Gestion améliorée des événements whiteboard
    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        console.log(`📥 [STUDENT VIEW] - Received ${operations.length} whiteboard operations`);
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    const handleFlushWhiteboardOperations = useCallback(() => {
        console.log(`🚀 [STUDENT VIEW] - Flushing whiteboard operations`);
        if (flushWhiteboardOperations) {
            flushWhiteboardOperations();
        }
    }, [flushWhiteboardOperations]);

    // ✅ CORRECTION CRITIQUE : Fonction améliorée pour vérifier l'état du stream
    const isStreamValid = useCallback((stream: MediaStream | null): boolean => {
        if (!stream) {
            console.log(`❌ [STREAM CHECK] - Stream is null`);
            return false;
        }
        
        if (!stream.active) {
            console.log(`❌ [STREAM CHECK] - Stream is not active`);
            return false;
        }
        
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        
        console.log(`🔍 [STREAM CHECK] - Total tracks: ${videoTracks.length + audioTracks.length}, Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
        
        // ✅ CORRECTION : Vérifier que le stream a au moins un track valide
        // Un track est valide s'il est en état 'live' - enabled=false est normal pour l'audio désactivé
        const hasValidVideoTracks = videoTracks.some(track => track.readyState === 'live');
        const hasValidAudioTracks = audioTracks.some(track => track.readyState === 'live');
        
        // ✅ CORRECTION : Log détaillé par track
        videoTracks.forEach((track, index) => {
            console.log(`🎥 [TRACK CHECK] - Video track ${index}: readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}`);
        });
        
        audioTracks.forEach((track, index) => {
            console.log(`🎤 [TRACK CHECK] - Audio track ${index}: readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}`);
        });
        
        const isValid = hasValidVideoTracks || hasValidAudioTracks;
        
        console.log(`✅ [STREAM CHECK] - Valid video tracks: ${hasValidVideoTracks}, Valid audio tracks: ${hasValidAudioTracks}, Stream valid: ${isValid}`);
        
        return isValid;
    }, []);

    // ✅ CORRECTION : Fonction pour vérifier l'affichage vidéo
    const canDisplayVideo = useCallback((stream: MediaStream | null): boolean => {
        if (!stream || !stream.active) return false;
        
        const videoTracks = stream.getVideoTracks();
        const hasActiveVideo = videoTracks.some(track => 
            track.readyState === 'live' && !track.muted
        );
        
        console.log(`📺 [VIDEO DISPLAY] - Can display video: ${hasActiveVideo}, Tracks: ${videoTracks.length}`);
        return hasActiveVideo;
    }, []);

    const renderMainContent = useCallback(() => {
        console.log(`🔄 [STUDENT VIEW] - Rendering main content for tool: ${activeTool}`);
        
        switch(activeTool) {
            case 'document':
                return <DocumentViewer url={documentUrl} />;
            case 'whiteboard':
                return (
                    <div className="h-full w-full relative">
                        {/* CORRECTION: Indicateur de statut de connexion */}
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
                // ✅ CORRECTION AMÉLIORÉE : Vérifications plus permissives
                const hasValidSpotlightedStream = isStreamValid(spotlightedStream);
                const canDisplaySpotlightedVideo = canDisplayVideo(spotlightedStream);

                console.log(`📹 [CAMERA VIEW] - Spotlighted: valid=${hasValidSpotlightedStream}, displayable=${canDisplaySpotlightedVideo}`);

                // ✅ CORRECTION : Afficher le stream spotlighted s'il est valide, même sans vidéo
                if (hasValidSpotlightedStream) {
                    return (
                        <div className="w-full h-full relative bg-black">
                            {/* ✅ CORRECTION : Indicateur de statut de stream */}
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
                            
                            {/* ✅ CORRECTION : Participant avec fallback pour user non défini */}
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

                // ✅ CORRECTION : Fallback seulement si le stream n'est pas valide
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
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    }, [
        activeTool,
        documentUrl,
        whiteboardControllerId,
        currentUserId,
        whiteboardOperations,
        spotlightedUser,
        spotlightedStream,
        isHandRaised,
        sessionId,
        isPresenceConnected,
        onlineMembersCount,
        handleWhiteboardEvent,
        handleFlushWhiteboardOperations,
        isStreamValid,
        canDisplayVideo,
        localStream,
        activeQuiz,
        onSubmitQuizResponse,
        quizResults
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
                             {/* ✅ CORRECTION : Afficher le stream spotlighted dans la sidebar quand ce n'est pas l'outil principal */}
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
                             
                             <AnimatedCard title="Mes Outils">
                                 <StudentSessionControls
                                    isHandRaised={isHandRaised}
                                    onRaiseHand={handleToggleHandRaise}
                                    onComprehensionUpdate={handleUnderstandingUpdate}
                                    currentComprehension={currentUnderstanding}
                                    isLoading={isHandRaiseLoading || isUnderstandingLoading}
                                />
                            </AnimatedCard>
                            
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
                                        {/* CORRECTION: Affichage des statistiques du whiteboard */}
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
