// hooks/useWebRTCNegotiation.ts
import { useRef } from 'react';

// Définir des types plus stricts pour les signaux
export type WebRTCSignal =
  | RTCSessionDescriptionInit
  | { type: 'ice-candidate', candidate: RTCIceCandidateInit | null };

export type PendingSignal = {
    fromUserId: string;
    signalData: {
      fromUserId: string;
      toUserId: string;
      signal: WebRTCSignal;
    };
};

class NegotiationQueue {
  private queue: Map<string, Array<() => Promise<void>>> = new Map();
  private processing: Map<string, boolean> = new Map();

  async enqueue(userId: string, task: () => Promise<void>) {
    if (!this.queue.has(userId)) {
      this.queue.set(userId, []);
    }
    this.queue.get(userId)!.push(task);
    await this.process(userId);
  }

  private async process(userId: string) {
    if (this.processing.get(userId)) return;

    this.processing.set(userId, true);
    while (this.queue.get(userId)?.length) {
      const task = this.queue.get(userId)!.shift();
      try {
        if (task) await task();
      } catch (e) {
        console.error(`Error processing task for ${userId}:`, e);
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Délai entre les tâches
    }
    this.processing.set(userId, false);
  }

  clear(userId?: string) {
    if (userId) {
      this.queue.delete(userId);
      this.processing.set(userId, false);
      console.log(`🧹 [WebRTC Queue] File d'attente nettoyée pour ${userId}`);
    } else {
      this.queue.clear();
      this.processing.clear();
      console.log("🧹 [WebRTC Queue] Toutes les files d'attente ont été nettoyées");
    }
  }
}

export function useWebRTCNegotiation() {
  const negotiationQueue = useRef(new NegotiationQueue()).current;

  return { negotiationQueue };
};
