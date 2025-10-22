"use client";

import { useEffect } from 'react';

export function DebugPusher() {
  useEffect(() => {
    console.log('🔧 [DEBUG] Environment variables:', {
      PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY ? '✅ Present' : '❌ Missing',
      PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });
  }, []);

  return null;
}
