// src/components/VideoPlayer.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { Instance as PeerInstance } from 'simple-peer';
import { User } from '@/lib/types';

interface VideoPlayerProps {
  peer: PeerInstance;
  userId: string;
  allUsers: User[];
}

export const VideoPlayer = ({ peer, userId, allUsers }: VideoPlayerProps) => {
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
    <div className="relative rounded-lg overflow-hidden border bg-muted">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        {user?.name || userId}
      </div>
    </div>
  );
};
