// src/components/StudentClassView.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { BackButton } from '@/components/BackButton';
import { StudentCard } from '@/components/StudentCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Users } from 'lucide-react';
import { pusherClient } from '@/lib/pusher/client';
import type { ClassroomWithStudents } from '@/app/student/class/[id]/page';

type PusherMember = {
  id: string;
  info: {
    email: string;
    name: string;
    user_id: string;
  };
};

type PusherMembers = {
  each: (callback: (member: PusherMember) => void) => void;
};

interface StudentClassViewProps {
  classroom: ClassroomWithStudents;
}

export function StudentClassView({ classroom }: StudentClassViewProps) {
  const [onlineUserEmails, setOnlineUserEmails] = useState<Set<string>>(new Set());
  
  const sortedStudents = useMemo(() => {
    return [...classroom.eleves].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  }, [classroom.eleves]);

  useEffect(() => {
    if (!classroom.id) return;

    const channelName = `presence-classe-${classroom.id}`;
    
    try {
        const channel = pusherClient.subscribe(channelName);
        
        channel.bind('pusher:subscription_succeeded', (members: PusherMembers) => {
            const onlineEmails = new Set<string>();
            members.each((member: PusherMember) => onlineEmails.add(member.info.email));
            setOnlineUserEmails(onlineEmails);
        });

        channel.bind('pusher:member_added', (member: PusherMember) => {
            setOnlineUserEmails(prev => new Set(prev).add(member.info.email));
        });

        channel.bind('pusher:member_removed', (member: PusherMember) => {
            setOnlineUserEmails(prev => {
                const newSet = new Set(prev);
                newSet.delete(member.info.email);
                return newSet;
            });
        });
        
        return () => {
            pusherClient.unsubscribe(channelName);
        };
    } catch (error) {
        console.error("💥 [Pusher] La souscription à Pusher a échoué:", error);
    }
  }, [classroom.id]);

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classroom.nom}</h1>
            <p className="text-muted-foreground">Membres de la classe</p>
          </div>
        </div>
      </div>

      <Alert className="mb-8">
        <Users className="h-4 w-4" />
        <AlertTitle>Vue de la Classe</AlertTitle>
        <AlertDescription>
          Voici la liste des élèves de votre classe. Cette vue est en lecture seule.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedStudents.map((student, index) => {
          const isConnected = !!student.email && onlineUserEmails.has(student.email);
          return (
            <StudentCard
              key={student.id}
              student={student as any}
              isConnected={isConnected}
              isSelectable={false} // Important: read-only
              rank={index + 1}
            />
          );
        })}
      </div>
    </main>
  );
}
