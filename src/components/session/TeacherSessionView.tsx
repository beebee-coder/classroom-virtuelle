// src/components/session/TeacherSessionView.tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Role, SessionParticipant } from '@/lib/types';
import { Participant } from '@/components/Participant';
import { StudentPlaceholder } from '../StudentPlaceholder';
import { HandRaiseController } from '../HandRaiseController';
import { UnderstandingTracker } from '../UnderstandingTracker';
import { Whiteboard } from '../Whiteboard';
import { Card } from '../ui/card';
import { ParticipantList } from './ParticipantList';
import { TeacherSessionControls } from '../TeacherSessionControls';

type UnderstandingStatus = 'understood' | 'confused' | 'lost' | 'none';

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
    timerValue,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    onEndSession,
    onScreenShare,
    isScreenSharing,
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
    understandingStatus: Map<string, UnderstandingStatus>;
    currentUserId: string;
    timerValue: string;
    onStartTimer: () => void;
    onPauseTimer: () => void;
    onResetTimer: () => void;
    onEndSession: () => void;
    onScreenShare: () => void;
    isScreenSharing: boolean;
}) {
    const remoteStreamsMap = new Map(remoteParticipants.map(p => [p.id, p.stream]));
    
    const studentsWithRaisedHands = allSessionUsers.filter(u => u.role === 'ELEVE' && raisedHands.has(u.id));
    const students = allSessionUsers.filter(u => u.role === 'ELEVE') as User[];
    const teacher = allSessionUsers.find(u => u.role === 'PROFESSEUR');
    
    if (!currentUserId || !teacher) return null;

    return (
        <div className="flex-1 flex min-h-0 py-6 gap-4">
            {/* --- Colonne de Gauche : Caméras des Participants --- */}
            <ScrollArea className="w-64 pr-4 -mr-4">
                 <div className="space-y-4">
                    {/* Vidéo du professeur */}
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
                    
                    {/* Vidéos des élèves */}
                    {students.map(student => {
                        const stream = remoteStreamsMap.get(student.id);
                        if (stream) {
                            return (
                                <Participant
                                    key={student.id}
                                    stream={stream}
                                    isLocal={false}
                                    isSpotlighted={student.id === spotlightedUser?.id}
                                    isTeacher={true} // Teacher can spotlight anyone
                                    participantUserId={student.id}
                                    onSpotlightParticipant={onSpotlightParticipant}
                                    displayName={student.name ?? ''}
                                    isHandRaised={raisedHands.has(student.id)}
                                />
                            );
                        }
                        // Affiche un placeholder si l'élève est hors-ligne ou sans vidéo
                        return (
                             <StudentPlaceholder
                                key={student.id}
                                student={student}
                                isOnline={onlineUserIds.includes(student.id)}
                                onSpotlightParticipant={onSpotlightParticipant}
                                isHandRaised={raisedHands.has(student.id)}
                            />
                        )
                    })}
                </div>
            </ScrollArea>

            {/* --- Colonne Centrale : Espace de travail --- */}
            <div className="flex-1 grid grid-rows-[2fr_3fr] gap-4 min-h-0">
                {/* Ligne 1: Tableau blanc ou partage d'écran */}
                <div className="flex flex-col min-h-0">
                    {screenStream ? (
                        <Card className="w-full h-full p-2 bg-black">
                            <Participant
                                stream={screenStream}
                                isLocal={true}
                                isTeacher={true}
                                participantUserId={currentUserId}
                                displayName="Votre partage d'écran"
                            />
                        </Card>
                    ) : (
                        <div className='h-full w-full'>
                            <Whiteboard />
                        </div>
                    )}
                </div>

                 {/* Ligne 2: Espace vide pour utilisation future */}
                 <TeacherSessionControls
                    onScreenShare={onScreenShare}
                    isScreenSharing={isScreenSharing}
                    raisedHands={Array.from(raisedHands)}
                    onLowerHand={(userId) => {}}
                    timerValue={timerValue}
                    onStartTimer={onStartTimer}
                    onPauseTimer={onPauseTimer}
                    onResetTimer={onResetTimer}
                    onEndSession={onEndSession}
                />
            </div>

            {/* --- Colonne de Droite : Outils Interactifs --- */}
            <div className="w-72 flex flex-col gap-4 min-h-0">
                 <ParticipantList allSessionUsers={allSessionUsers} onlineUserIds={onlineUserIds} currentUserId={currentUserId} />
                 <UnderstandingTracker students={students} understandingStatus={understandingStatus} />
                 <HandRaiseController sessionId={sessionId} raisedHands={studentsWithRaisedHands} />
            </div>
        </div>
    );
}
