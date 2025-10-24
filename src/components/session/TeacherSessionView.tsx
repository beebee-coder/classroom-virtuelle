// src/components/session/TeacherSessionView.tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role, SessionParticipant, ClassroomWithDetails } from '@/lib/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Whiteboard } from '../Whiteboard';
import { Card } from '../ui/card';
import { ParticipantList } from './ParticipantList';
import { TeacherSessionControls } from '../TeacherSessionControls';
import { ComprehensionLevel } from '../StudentSessionControls';
import { DocumentViewer } from '../DocumentViewer';
import { ClassStudentList } from './ClassStudentList';
import { Loader2 } from 'lucide-react';

export function TeacherSessionView({
    sessionId,
    localStream,
    screenStream,
    remoteParticipants,
    spotlightedUser,
    allSessionUsers,
    onlineUserIds,
    onSpotlightParticipant,
    raisedHands,
    understandingStatus,
    currentUserId,
    activeTool,
    onToolChange,
    classroom 
}: {
    sessionId: string;
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    remoteParticipants: { id: string, stream: MediaStream }[];
    spotlightedUser: SessionParticipant | undefined | null;
    allSessionUsers: SessionParticipant[];
    onlineUserIds: string[];
    onSpotlightParticipant: (participantId: string) => void;
    raisedHands: Set<string>;
    understandingStatus: Map<string, ComprehensionLevel>;
    currentUserId: string;
    activeTool: string;
    onToolChange: (tool: string) => void;
    classroom: ClassroomWithDetails | null;
}) {
    const remoteStreamsMap = new Map(remoteParticipants.map(p => [p.id, p.stream]));
    
    const studentsWithRaisedHands = allSessionUsers.filter(u => u.role === 'ELEVE' && raisedHands.has(u.id)) as User[];
    
    // Utiliser la liste complète de la classe si disponible, sinon les participants invités
    const students = classroom?.eleves || allSessionUsers.filter(u => u.role === 'ELEVE') as User[];
    
    const teacher = allSessionUsers.find(u => u.role === 'PROFESSEUR');
    
    if (!currentUserId || !teacher) return null;

    const activeParticipantIds = [currentUserId, ...remoteParticipants.map(p => p.id)];

    const renderActiveTool = () => {
        if (screenStream) {
             return (
                <Card className="w-full h-full p-2 bg-black">
                    <Participant
                        stream={screenStream}
                        isLocal={true}
                        isTeacher={true}
                        participantUserId={currentUserId}
                        displayName="Votre partage d'écran"
                    />
                </Card>
            );
        }

        switch(activeTool) {
            case 'document':
                return <DocumentViewer />;
            case 'camera':
                 const spotlightedStream = spotlightedUser?.id === currentUserId 
                    ? localStream
                    : remoteStreamsMap.get(spotlightedUser?.id ?? '');

                if (!spotlightedUser || !spotlightedStream) {
                    return (
                        <Card className="aspect-video w-full h-full flex items-center justify-center bg-muted rounded-lg">
                            <div className="text-center text-muted-foreground">
                                <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                                <p className="mt-2">Recherche du participant en vedette...</p>
                            </div>
                        </Card>
                    );
                }
                return (
                    <Card className="w-full h-full p-2 bg-black">
                         <Participant
                            stream={spotlightedStream}
                            isLocal={spotlightedUser.id === currentUserId}
                            isSpotlighted={true}
                            isTeacher={true}
                            participantUserId={spotlightedUser.id}
                            onSpotlightParticipant={onSpotlightParticipant}
                            displayName={spotlightedUser.name ?? ''}
                            isHandRaised={raisedHands.has(spotlightedUser.id)}
                        />
                    </Card>
                );
            case 'whiteboard':
            default:
                return <Whiteboard />;
        }
    };

    return (
        <div className="flex-1 flex min-h-0 py-6 gap-4">
            {/* --- Colonne Principale : Espace de travail & Vidéos --- */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Espace de contenu : Tableau blanc ou Partage d'écran */}
                <div className="flex-1">
                   {renderActiveTool()}
                </div>

                {/* Bandeau de vidéos (Filmstrip) */}
                <ScrollArea className="w-full pb-4">
                    <div className="flex gap-4">
                        {/* Professeur */}
                        <div className="w-48 shrink-0">
                            <Participant 
                                key={teacher.id}
                                stream={localStream}
                                isLocal={true}
                                isSpotlighted={teacher.id === spotlightedUser?.id}
                                isTeacher={true}
                                participantUserId={teacher.id}
                                onSpotlightParticipant={onSpotlightParticipant}
                                displayName={teacher.name ?? ''}
                                isHandRaised={raisedHands.has(teacher.id)}
                            />
                        </div>
                         {/* Élèves */}
                        {students.map(student => {
                            const stream = remoteStreamsMap.get(student.id);
                            return (
                                <div className="w-48 shrink-0" key={student.id}>
                                {stream ? (
                                    <Participant
                                        stream={stream}
                                        isLocal={false}
                                        isSpotlighted={student.id === spotlightedUser?.id}
                                        isTeacher={true}
                                        participantUserId={student.id}
                                        onSpotlightParticipant={onSpotlightParticipant}
                                        displayName={student.name ?? ''}
                                        isHandRaised={raisedHands.has(student.id)}
                                    />
                                ) : (
                                    <StudentPlaceholder
                                        student={student as User}
                                        isOnline={onlineUserIds.includes(student.id)}
                                        onSpotlightParticipant={onSpotlightParticipant}
                                        isHandRaised={raisedHands.has(student.id)}
                                    />
                                )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>

            {/* --- Colonne de Droite : Outils Interactifs --- */}
            <div className="w-72 flex flex-col gap-4 min-h-0">
                <ScrollArea className='h-full'>
                    <div className='space-y-4 pr-3'>
                        <TeacherSessionControls
                            activeTool={activeTool}
                            onToolChange={onToolChange}
                        />
                        <ParticipantList allSessionUsers={allSessionUsers} onlineUserIds={onlineUserIds} currentUserId={currentUserId} />
                         {/* NOUVEAU : Liste de tous les élèves de la classe */}
                         {classroom && (
                            <ClassStudentList 
                                classroom={classroom}
                                onlineUserIds={onlineUserIds}
                                currentUserId={currentUserId}
                                activeParticipantIds={activeParticipantIds}
                                sessionId={sessionId}
                            />
                        )}
                        <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                        <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
