// components/OnlineUsers.tsx
"use client";
import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher/client';
import { Users } from 'lucide-react';
import type { PresenceChannel } from 'pusher-js';

interface OnlineUsersProps {
  channelType: 'classe' | 'session';
  channelId: string;
}

export function OnlineUsers({ channelType, channelId }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (!channelId) return;
    
    const channelName = `presence-${channelType}-${channelId}`;
    const channel = pusherClient.subscribe(channelName) as PresenceChannel;
    
    const updateUsers = () => {
        const users = Object.keys(channel.members.members).map((id) => ({
            id: id,
            name: channel.members.members[id].name
        }));
        setOnlineUsers(users);
    }

    channel.bind('pusher:subscription_succeeded', updateUsers);
    channel.bind('pusher:member_added', updateUsers);
    channel.bind('pusher:member_removed', updateUsers);

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [channelId, channelType]);

  return (
    <div className="bg-muted p-3 rounded-lg border">
      <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
        <Users className="h-4 w-4" /> En ligne ({onlineUsers.length})
      </h4>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {onlineUsers.map(user => (
          <div key={user.id} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">{user.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
