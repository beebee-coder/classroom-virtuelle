// src/components/VideoPlayer.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { Instance as PeerInstance } from 'simple-peer';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  peer: PeerInstance;
  userId: string;
  allUsers: User[];
  isSpotlighted?: boolean;
  showControls?: boolean;
}

export const VideoPlayer = ({ peer, userId, allUsers, isSpotlighted, showControls }: VideoPlayerProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const user = allUsers.find(u => u.id === userId);

  useEffect(() => {
    peer.on('stream', stream => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });

     peer.on('error', err => {
      console.error(`Error in peer for ${userId}:`, err);
    });

    return () => {
      peer.removeAllListeners('stream');
      peer.removeAllListeners('error');
    };
  }, [peer, userId]);

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden border bg-muted transition-all",
      isSpotlighted && "ring-4 ring-yellow-400 border-yellow-400"
    )}>
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {user?.name || userId}
      </div>
    </div>
  );
};
