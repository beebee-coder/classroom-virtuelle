// src/lib/pusher/server.ts - Simulation pour le développement frontend
'use server';

// Interface pour la simulation Pusher
interface PusherTriggerOptions {
  socket_id?: string;
}

interface PusherResponse {
  status: number;
  body: string;
}

class PusherServerSimulation {
  private isSimulation: boolean = true;

  async trigger(
    channel: string, 
    event: string, 
    data: any, 
    options?: PusherTriggerOptions
  ): Promise<PusherResponse> {
    console.log(`[PUSHER SIMULATION] - Trigger sur channel: ${channel}, event: ${event}`, data);
    
    // Simulation du comportement Pusher
    if (this.isSimulation) {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simuler une réponse réussie
      return {
        status: 200,
        body: JSON.stringify({ message: 'Event triggered successfully' })
      };
    }

    // En production, ce serait l'appel réel à Pusher
    throw new Error('Pusher non configuré en mode simulation');
  }

  async triggerBatch(events: Array<{ channel: string; event: string; data: any }>): Promise<PusherResponse> {
    console.log('[PUSHER SIMULATION] - Trigger batch:', events);
    
    for (const event of events) {
      await this.trigger(event.channel, event.event, event.data);
    }
    
    return {
      status: 200,
      body: JSON.stringify({ message: 'Batch events triggered successfully' })
    };
  }

  // Méthode pour désactiver la simulation (pour les tests)
  disableSimulation() {
    this.isSimulation = false;
  }
}

// Export singleton instance
export const pusherServer = new PusherServerSimulation();

// Fonctions utilitaires pour la simulation
export async function authorizeChannel(
  socketId: string, 
  channelName: string
): Promise<{ auth: string }> {
  console.log(`[PUSHER SIMULATION] - Authorize channel: ${channelName} for socket: ${socketId}`);
  
  // Simulation d'une autorisation réussie
  return {
    auth: `simulated-auth-${socketId}-${channelName}`
  };
}

export async function authenticateUser(
  socketId: string, 
  user: any
): Promise<{ auth: string; user_data: any }> {
  console.log(`[PUSHER SIMULATION] - Authenticate user:`, user);
  
  // Simulation d'une authentification réussie
  return {
    auth: `simulated-user-auth-${socketId}`,
    user_data: {
      ...user,
      id: user.id || 'simulated-user-id'
    }
  };
}

// Types pour TypeScript
export interface PusherChannelAuth {
  auth: string;
  channel_data?: string;
}

export interface PusherUserAuth {
  auth: string;
  user_data: string;
}