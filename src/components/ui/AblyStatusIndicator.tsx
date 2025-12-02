// src/components/ui/AblyStatusIndicator.tsx - VERSION CORRIGÉE FINALE
'use client';

import { useAblyHealth, type AblyConnectionStatus } from '@/hooks/useAblyHealth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { memo } from 'react'; // ✅ CORRECTION: Ajout de memo pour éviter re-rendus inutiles

const statusConfig: Record<AblyConnectionStatus, { color: string; label: string; icon: React.ElementType; pulsing?: boolean }> = {
    initialized: { color: 'bg-gray-400', label: 'Initializing', icon: Loader2, pulsing: true },
    connecting: { color: 'bg-yellow-400', label: 'Connecting...', icon: Loader2, pulsing: true },
    connected: { color: 'bg-green-500', label: 'Real-time connection active', icon: Wifi },
    disconnected: { color: 'bg-yellow-400', label: 'Disconnected, will retry', icon: Loader2, pulsing: true },
    suspended: { color: 'bg-orange-500', label: 'Connection suspended, retrying...', icon: Loader2, pulsing: true },
    closing: { color: 'bg-gray-400', label: 'Closing connection', icon: WifiOff },
    closed: { color: 'bg-gray-500', label: 'Connection closed', icon: WifiOff },
    failed: { color: 'bg-red-500', label: 'Connection failed', icon: WifiOff },
};

// ✅ CORRECTION FINALE: Utilisation de memo pour éviter les re-rendus inutiles
export const AblyStatusIndicator = memo(function AblyStatusIndicator() {
    // ✅ CORRECTION: Nom explicite pour le debug
    const { status, error } = useAblyHealth('AblyStatusIndicator');
    const config = statusConfig[status] || statusConfig.failed;
    const Icon = config.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-6 h-6">
                        <Icon className={cn(
                            "h-4 w-4",
                            config.color.replace('bg-', 'text-'), // Convert bg color to text color for icon
                            config.pulsing && "animate-spin"
                        )} />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{config.label}</p>
                    {error && <p className="text-xs text-red-400">{error}</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
});

// ✅ CORRECTION: Display name pour le debug
AblyStatusIndicator.displayName = 'AblyStatusIndicator';
