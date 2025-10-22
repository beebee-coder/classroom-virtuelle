// src/lib/pusher/server.ts - Version corrigée pour Server Actions
'use server';

// Interfaces pour TypeScript
interface PusherTriggerOptions {
  socket_id?: string;
}

interface PusherResponse {
  status: number;
  body: string;
}

interface PusherChannelAuth {
  auth: string;
  channel_data?: string;
}

interface PusherUserAuth {
  auth: string;
  user_data: string;
}

// Simulation state
let isSimulation = true;

// Fonctions principales pour remplacer la classe
export async function pusherTrigger(
  channel: string, 
  event: string, 
  data: any, 
  options?: PusherTriggerOptions
): Promise<PusherResponse> {
  console.log(`[PUSHER SIMULATION] - Trigger sur channel: ${channel}, event: ${event}`, data);
  
  // Simulation du comportement Pusher
  if (isSimulation) {
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simuler une réponse réussie
    return {
      status: 200,
      body: JSON.stringify({ 
        message: 'Event triggered successfully',
        channel,
        event,
        data 
      })
    };
  }

  // En production, ce serait l'appel réel à Pusher
  throw new Error('Pusher non configuré en mode simulation');
}

export async function pusherTriggerBatch(
  events: Array<{ channel: string; event: string; data: any }>
): Promise<PusherResponse> {
  console.log('[PUSHER SIMULATION] - Trigger batch:', events);
  
  for (const event of events) {
    await pusherTrigger(event.channel, event.event, event.data);
  }
  
  return {
    status: 200,
    body: JSON.stringify({ 
      message: 'Batch events triggered successfully',
      eventsCount: events.length 
    })
  };
}

// Méthode pour désactiver la simulation (pour les tests)
export async function disablePusherSimulation(): Promise<void> {
  isSimulation = false;
  console.log('[PUSHER SIMULATION] - Simulation désactivée');
}

export async function enablePusherSimulation(): Promise<void> {
  isSimulation = true;
  console.log('[PUSHER SIMULATION] - Simulation activée');
}

// Fonctions utilitaires pour la simulation
export async function authorizeChannel(
  socketId: string, 
  channelName: string
): Promise<PusherChannelAuth> {
  console.log(`[PUSHER SIMULATION] - Authorize channel: ${channelName} for socket: ${socketId}`);
  
  // Simulation d'une autorisation réussie
  return {
    auth: `simulated-auth-${socketId}-${channelName}`,
    channel_data: JSON.stringify({
      user_id: socketId,
      user_info: { channel: channelName }
    })
  };
}

export async function authenticateUser(
  socketId: string, 
  user: any
): Promise<PusherUserAuth> {
  console.log(`[PUSHER SIMULATION] - Authenticate user:`, user);
  
  // Simulation d'une authentification réussie
  return {
    auth: `simulated-user-auth-${socketId}`,
    user_data: JSON.stringify({
      ...user,
      id: user.id || 'simulated-user-id'
    })
  };
}

// Fonction pour vérifier l'état de la simulation
export async function getPusherSimulationStatus(): Promise<{ isSimulation: boolean }> {
  return { isSimulation };
}