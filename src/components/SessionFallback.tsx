// src/components/SessionFallback.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionFallbackProps {
  sessionId: string;
  error?: string;
}

export function SessionFallback({ sessionId, error }: SessionFallbackProps) {
  const router = useRouter();
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    router.refresh();
  };

  useEffect(() => {
    if (retryCount < 2) {
      const timer = setTimeout(handleRetry, 3000);
      return () => clearTimeout(timer);
    }
  }, [retryCount, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="mb-4">
          <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error === 'Timeout' ? 'Session en cours de chargement...' : 'Problème de connexion'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error === 'Timeout' 
              ? 'La session prend plus de temps que prévu à charger.'
              : 'Impossible de charger la session. Vérifiez votre connexion.'
            }
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            {retryCount < 2 ? 'Réessayer automatiquement...' : 'Réessayer manuellement'}
          </button>
          
          <button
            onClick={() => router.push('/teacher/dashboard')}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>

        {retryCount > 0 && (
          <p className="mt-4 text-sm text-gray-500">
            Tentative {retryCount + 1}/3
          </p>
        )}
      </div>
    </div>
  );
}