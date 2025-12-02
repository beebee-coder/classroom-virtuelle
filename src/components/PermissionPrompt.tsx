// src/components/PermissionPrompt.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Mic, AlertTriangle } from 'lucide-react';

export function PermissionPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'denied' | 'granted'>('prompt');

  useEffect(() => {
    const checkPermissions = async () => {
      if (!navigator.permissions) {
        console.warn('Permissions API not supported, showing prompt by default.');
        setShowPrompt(true);
        return;
      }

      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });

        const handlePermissionChange = () => {
          if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
             setPermissionState('granted');
             setShowPrompt(false);
          } else if (cameraPermission.state === 'denied' || microphonePermission.state === 'denied') {
            setPermissionState('denied');
            setShowPrompt(true);
          } else {
            setPermissionState('prompt');
            setShowPrompt(true);
          }
        };
        
        handlePermissionChange();

        cameraPermission.onchange = handlePermissionChange;
        microphonePermission.onchange = handlePermissionChange;

      } catch (error) {
        console.warn('Permissions API failed, showing prompt as fallback.', error);
        setShowPrompt(true);
      }
    };

    checkPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      stream.getTracks().forEach(track => track.stop());
      
      setShowPrompt(false);
      setPermissionState('granted');
      
      window.location.reload();
    } catch (error) {
      setPermissionState('denied');
      console.error('Permission request failed:', error);
    }
  };

  if (!showPrompt || permissionState === 'granted') return null;

  return (
    <Alert className="mb-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700/50">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">
        Permissions requises pour la visioconférence
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300 mt-2">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span>Caméra</span>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Microphone</span>
          </div>
        </div>
        
        {permissionState === 'denied' ? (
          <div className="space-y-2">
            <p className="text-sm">
              ❌ **Accès bloqué.** Pour activer votre caméra et micro :
            </p>
            <ol className="text-sm list-decimal list-inside space-y-1 pl-2">
              <li>Cliquez sur l'icône 🔒 à gauche de l'URL dans la barre d'adresse.</li>
              <li>Activez les permissions pour la **Caméra** et le **Microphone**.</li>
              <li>Rechargez la page.</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Pour participer pleinement, veuillez autoriser l'accès à votre caméra et microphone.
            </p>
            <Button 
              onClick={requestPermissions}
              className="bg-yellow-600 hover:bg-yellow-700 text-white dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:text-black"
            >
              Autoriser l'accès
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
