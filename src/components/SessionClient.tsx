// src/components/SessionClient.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import type { CoursSessionWithRelations, Role, StudentForCard, User } from '@/lib/types';
import SimplePeer, { Instance as PeerInstance, SignalData } from 'simple-peer';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { ParticipantGrid } from './ParticipantGrid';
import { TeacherSessionControls } from './TeacherSessionControls';
import { StudentSessionControls } from './StudentSessionControls';
import SessionLoading from './SessionLoading';
import { endCoursSession } from '@/lib/actions';


interface SessionClientProps {
  sessionId: string;
  initialSession: CoursSessionWithRelations;
  initialStudents: StudentForCard[];
  initialTeacher: User;
  currentUserRole: Role;
  currentUserId: string;
}

interface PeerData {
  peer: PeerInstance;
  userId: string;
}

export default function SessionClient({
  sessionId,
  initialSession,
  initialStudents,
  initialTeacher,
  currentUserRole,
  currentUserId,
}: SessionClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [session, setSession] = useState(initialSession);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const peersRef = useRef<PeerData[]>([]);

  const [spotlightId, setSpotlightId] = useState<string | null>(initialTeacher.id);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);

  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [comprehension, setComprehension] = useState<Record<string, 'compris' | 'confus' | 'perdu'>>({});

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);

  const channelName = `presence-session-${sessionId}`;

  // Initialize Media Stream
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (userVideoRef.current) {
          userVideoD