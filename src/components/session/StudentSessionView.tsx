// src/components/session/StudentSessionView.tsx - VERSION CORRIGÉE
'use client';

import { useState, type ReactNode, useEffect, useMemo, useCallback, useRef } from 'react';
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
    const [debugInfo, setDebugInfo] = useState<string>('');
    
    // CORRECTION : Référence pour éviter les effets excessifs
    const debugInfoRef = useRef<string>('');
    
    // CORRECTION : Heartbeat avec gestion d'erreur robuste
    useEffect(() => {
        const ACTIVITY_INTERVAL_MS = 30000;
        
        const intervalId = setInterval(() => {
            trackStudentActivity(ACTIVITY_INTERVAL_MS / 1000)
                .then((result) => {
                    // CORRECTION : Validation du résultat
                    if (result && result.success && result.pointsAwarded > 0) {
                        console.log(`✨ [HEARTBEAT] +${result.pointsAwarded} points attribués.`);
                    } else if (result && !result.success) {
                        console.warn('⚠️ [HEARTBEAT] - Échec du suivi d\'activité');
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

    // CORRECTION : Handler lever/main avec validation améliorée
    const handleToggleHandRaise = useCallback(async (): Promise<void> => {
        if (isHandRaiseLoading) {
            console.log('⏳ [STUDENT VIEW] - Déjà en train de traiter la main');
            return;
        }
        
        const newHandRaiseState = !isHandRaised;
        setIsHandRaiseLoading(true);
        
        const previousHandRaiseState = isHandRaised;
        
        console.log(`✋ [STUDENT VIEW] - ${newHandRaiseState ? 'Lever' : 'Baisser'} la main`);
        
        // Mettre à jour l'état local immédiatement pour un feedback visuel rapide
        onToggleHandRaise(newHandRaiseState);
        
        try {
            const result = await updateStudentSessionStatus(sessionId, {
                isHandRaised: newHandRaiseState,
                understanding: currentUnderstanding
            });
            
            if (result.success) {
                console.log(`✅ [STUDENT VIEW] - Statut main mis à jour: ${newHandRaiseState}`);
            } else {
                throw new Error('Erreur inconnue lors de la mise à jour du statut');
            }
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
    
    // CORRECTION : Handler compréhension avec validation améliorée
    const handleUnderstandingUpdate = useCallback(async (status: ComprehensionLevel): Promise<void> => {
        if (isUnderstandingLoading) {
            console.log('⏳ [STUDENT VIEW] - Déjà en train de traiter la compréhension');
            return;
        }
        
        const newStatus = currentUnderstanding === status ? ComprehensionLevel.NONE : status;
        setIsUnderstandingLoading(true);
        
        const previousStatus = currentUnderstanding;
        
        console.log(`🧠 [STUDENT VIEW] - Changement compréhension: ${newStatus}`);
        
        // Mettre à jour l'état local immédiatement
        onUnderstandingChange(newStatus);
        
        try {
            const result = await updateStudentSessionStatus(sessionId, { 
                understanding: newStatus,
                isHandRaised
            });
            
            if (result.success) {
                console.log(`✅ [STUDENT VIEW] - Statut compréhension mis à jour: ${newStatus}`);
            } else {
                throw new Error('Erreur inconnue lors de la mise à jour de la compréhension');
            }
        } catch (error) {
            console.error('❌ [STUDENT VIEW] - Erreur mise à jour compréhension:', error);
            toast({ 
                variant: 'destructive', 
                title: 'Erreur', 
                description: 'Impossible de mettre à jour le statut de compréhension.'
            });
            // Revenir à l'état précédent en cas d'erreur
            onUnderstandingChange(previousStatus);
        } finally {
            setIsUnderstandingLoading(false);
        }
    }, [isUnderstandingLoading, currentUnderstanding, sessionId, isHandRaised, onUnderstandingChange, toast]);

    // CORRECTION : Handler whiteboard avec validation
    const handleWhiteboardEvent = useCallback((operations: WhiteboardOperation[]) => {
        if (!operations || !Array.isArray(operations)) {
            console.warn('⚠️ [STUDENT VIEW] - Opérations whiteboard invalides:', operations);
            return;
        }
        
        console.log(`🎨 [STUDENT VIEW] - ${operations.length} opérations whiteboard`);
        onWhiteboardEvent(operations);
    }, [onWhiteboardEvent]);

    // CORRECTION : Handler flush avec validation
    const handleFlushWhiteboardOperations = useCallback(() => {
        console.log(`🔄 [STUDENT VIEW] - Flush des opérations whiteboard`);
        if (flushWhiteboardOperations && typeof flushWhiteboardOperations === 'function') {
            flushWhiteboardOperations();
        } else {
            console.warn('⚠️ [STUDENT VIEW] - Fonction flushWhiteboardOperations non disponible');
        }
    }, [flushWhiteboardOperations]);

    // CORRECTION : Validation du stream local optimisée
    const isLocalStreamValid = useMemo(() => {
        const isValid = !!localStream && 
                      localStream.active && 
                      (localStream.getAudioTracks().length > 0 || localStream.getVideoTracks().length > 0);
        
        console.log(`📹 [STUDENT VIEW] - Stream local valide: ${isValid}`);
        return isValid;
    }, [localStream]);

    // CORRECTION : Validation du stream spotlight optimisée
    const isSpotlightStreamValid = useMemo(() => {
        if (!spotlightedStream) {
            return false;
        }
        
        const isValid = spotlightedStream.active && 
                       (spotlightedStream.getVideoTracks().length > 0 || spotlightedStream.getAudioTracks().length > 0);
        
        // CORRECTION : Vérification supplémentaire des tracks
        const videoTracks = spotlightedStream.getVideoTracks();
        const audioTracks = spotlightedStream.getAudioTracks();
        const hasActiveTracks = videoTracks.some(track => track.readyState === 'live') || 
                               audioTracks.some(track => track.readyState === 'live');
        
        const finalValid = isValid && hasActiveTracks;
        
        // CORRECTION : Mise à jour des infos de débogage
        if (process.env.NODE_ENV === 'development') {
            const newDebugInfo = `Stream: ${spotlightedStream ? 'Oui' : 'Non'}, Actif: ${spotlightedStream?.active}, ` +
                               `Vidéo: ${videoTracks.length}, Audio: ${audioTracks.length}, ` +
                               `Tracks Actifs: ${hasActiveTracks}, Final: ${finalValid}`;
            
            if (newDebugInfo !== debugInfoRef.current) {
                debugInfoRef.current = newDebugInfo;
                setDebugInfo(newDebugInfo);
            }
        }
        
        return finalValid;
    }, [spotlightedStream]);

    // CORRECTION : Fonction de rendu du contenu principal OPTIMISÉE
    const renderMainContent = useCallback((): ReactNode => {
        // CORRECTION : Logs de débogage conditionnels (uniquement en développement)
        if (process.env.NODE_ENV === 'development') {
            console.log(`🎯 [STUDENT VIEW] - Rendu contenu principal, outil: ${activeTool}, spotlightUser: ${spotlightedUser?.id}`);
            console.log(`🔍 [STUDENT DEBUG] - spotlightedStream valide: ${isSpotlightStreamValid}`);
            console.log(`🔍 [STUDENT DEBUG] - ${debugInfo}`);
        }

        switch(activeTool) {
            case 'document':
                console.log(`📄 [STUDENT VIEW] - Affichage document: ${documentUrl ? 'Oui' : 'Non'}`);
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
                console.log(`❓ [STUDENT VIEW] - Affichage quiz: ${activeQuiz?.id || 'Aucun'}`);
                
                if (!activeQuiz) {
                    return (
                        <div className="h-full w-full flex items-center justify-center p-4">
                            <Card className="p-6 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground">Aucun quiz actif</p>
                                </CardContent>
                            </Card>
                        </div>
                    );
                }
                
                return (
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <QuizView
                            quiz={activeQuiz}
                            isTeacherView={false}
                            onSubmitResponse={onSubmitQuizResponse}
                            results={quizResults}
                        />
                    </div>
                );
                
            case 'camera':
            default:
                console.log(`📹 [STUDENT VIEW] - Mode camera, spotlightStream valide: ${isSpotlightStreamValid}`);
                
                if (isSpotlightStreamValid) {
                    console.log(`✅ [STUDENT VIEW] - Affichage du stream spotlight`);
                    return (
                        <div className="w-full h-full relative bg-black rounded-lg overflow-hidden">
                            <Participant 
                                stream={spotlightedStream!}
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

                // CORRECTION : Affichage d'attente amélioré avec infos contextuelles
                console.log(`⚠️ [STUDENT VIEW] - Aucun stream spotlight valide`);
                return (
                    <Card className="h-full w-full flex flex-col items-center justify-center bg-muted/30 border-dashed">
                        <CardContent className="text-center text-muted-foreground p-6">
                            <div className="flex flex-col items-center gap-3">
                                <VideoOff className="h-12 w-12 mx-auto text-orange-500" />
                                <div>
                                    <h3 className="font-semibold text-xl mb-2">
                                        {spotlightedUser ? `${spotlightedUser.name} se connecte` : 'En attente du professeur...'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {spotlightedUser 
                                            ? 'La connexion vidéo est en cours d\'établissement...' 
                                            : 'Le professeur rejoindra bientôt la session'
                                        }
                                    </p>
                                </div>
                                
                                {/* CORRECTION : Indicateur de statut de connexion */}
                                <div className="flex items-center gap-2 text-xs text-orange-600">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Connexion WebRTC en cours...</span>
                                </div>
                                
                                {/* CORRECTION : Informations de débogage conditionnelles */}
                                {process.env.NODE_ENV === 'development' && (
                                    <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-100 rounded max-w-md">
                                        <div className="font-medium mb-1">Informations de débogage:</div>
                                        <div className="text-left space-y-1">
                                            <div>• Stream reçu: {spotlightedStream ? 'Oui' : 'Non'}</div>
                                            <div>• Stream actif: {spotlightedStream?.active ? 'Oui' : 'Non'}</div>
                                            <div>• Tracks vidéo: {spotlightedStream?.getVideoTracks().length || 0}</div>
                                            <div>• Tracks audio: {spotlightedStream?.getAudioTracks().length || 0}</div>
                                            <div>• Utilisateur spotlight: {spotlightedUser?.id || 'Non défini'}</div>
                                            <div>• Validation finale: {isSpotlightStreamValid ? 'Valide' : 'Invalide'}</div>
                                        </div>
                                    </div>
                                )}
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
        activeQuiz,
        onSubmitQuizResponse,
        quizResults,
        isSpotlightStreamValid,
        debugInfo
    ]);

    // CORRECTION : Mémoization du contenu principal
    const mainContent = useMemo(() => renderMainContent(), [renderMainContent]);
    
    return (
        <div className="flex flex-row flex-1 min-h-0 gap-4">
            {/* CORRECTION : Contenu principal */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full h-full relative rounded-lg overflow-hidden border bg-card">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTool}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full"
                        >
                            {mainContent}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* CORRECTION : Sidebar avec contenu conditionnel */}
            <div className="w-60 flex-shrink-0 flex flex-col">
                <motion.div layout className="h-full flex flex-col gap-1">
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                         <div className="space-y-4">
                             {/* CORRECTION : Affichage conditionnel du spotlight dans la sidebar */}
                             {activeTool !== 'camera' && isSpotlightStreamValid && (
                                <AnimatedCard title={spotlightedUser?.name || "Professeur"}>
                                    <div className="p-2">
                                         <Participant
                                            stream={spotlightedStream!}
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
                                    {isLocalStreamValid ? (
                                        <Participant
                                            stream={localStream!}
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
                            
                            {/* CORRECTION : Statut whiteboard conditionnel */}
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
