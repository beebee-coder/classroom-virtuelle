// src/components/VideoGrid.tsx
'use client';

import { Participant } from "./Participant";
import type { User } from "@prisma/client";

interface VideoGridProps {
    sessionId: string;
    localStream: MediaStream | null;
    localUserId: string;
    participants: { id: string, stream: MediaStream }[];
    spotlightedParticipantId?: string | null;
    isTeacher: boolean;
    onSpotlightParticipant: (userId: string) => void;
    allSessionUsers: User[];
}

export function VideoGrid({ 
    sessionId, 
    localStream,
    localUserId,
    participants, 
    spotlightedParticipantId, 
    isTeacher,
    onSpotlightParticipant,
    allSessionUsers,
}: VideoGridProps) {

    const findUserById = (userId: string) => {
        return allSessionUsers.find(user => user.id === userId);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {localStream && (() => {
                const user = findUserById(localUserId);
                if (!user) return null;
                return (
                    <Participant 
                        key={localUserId}
                        stream={localStream}
                        isLocal={true}
                        isSpotlighted={localUserId === spotlightedParticipantId}
                        isTeacher={isTeacher}
                        participantUserId={user.id}
                        onSpotlightParticipant={onSpotlightParticipant}
                        displayName={user.name ?? ''}
                    />
                );
            })()}
            {participants.map(p => {
                const user = findUserById(p.id);
                if (!user) return null;
                return (
                    <Participant 
                        key={p.id}
                        stream={p.stream}
                        isLocal={false}
                        isSpotlighted={p.id === spotlightedParticipantId}
                        isTeacher={false} // Assuming only teacher can be local and teacher
                        participantUserId={user.id}
                        onSpotlightParticipant={onSpotlightParticipant}
                        displayName={user.name ?? ''}
                    />
                );
            })}
        </div>
    )
}
