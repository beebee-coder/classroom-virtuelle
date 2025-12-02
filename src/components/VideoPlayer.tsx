// src/components/VideoPlayer.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream?: MediaStream;
  isLocal: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, isLocal }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal} // Le flux local doit être muet pour éviter l'écho
      className="w-full h-full object-cover"
    />
  );
};

export default VideoPlayer;
