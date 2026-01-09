// src/app/student/onboarding/page.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyPopper, Clock, Loader2, LogOut } from "lucide-react";
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;
    if (isListening) return;

    const setupAblyListener = async () => {
        try {
          const { getAblyClient } = await import('@/lib/ably/client');
          const { getUserChannelName } = await import('@/lib/ably/channels');
          const { AblyEvents } = await import('@/lib/ably/events');
      
          const ably = getAblyClient();
          const channelName = getUserChannelName(session.user.id);
          const channel = ably.channels.get(channelName);
      
          const handleStudentValidated = async () => {
            console.log('[ONBOARDING] Événement STUDENT_VALIDATED reçu. Mise à jour de la session...');
            await update(); // Force la mise à jour du token JWT
          };
      
          channel.subscribe(AblyEvents.STUDENT_VALIDATED, handleStudentValidated);
          setIsListening(true);
      
          return () => {
            channel.unsubscribe(AblyEvents.STUDENT_VALIDATED, handleStudentValidated);
            // Ne pas fermer le client globalement ici
          };
        } catch (error) {
          console.error('[ONBOARDING] Impossible d’initialiser l’écoute Ably:', error);
        }
      };

    setupAblyListener();
  }, [status, session, isListening, router, update]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const { role, validationStatus, classeId, isNewUser } = session.user as any;
      if (
        role === 'ELEVE' &&
        validationStatus === 'VALIDATED' &&
        classeId &&
        !isNewUser // Le flag isNewUser est maintenant faux après la mise à jour
      ) {
        router.push('/student/dashboard');
      }
    }
  }, [status, session, router]);

  // Fallback de sécurité (polling toutes les 15s)
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        console.log('[ONBOARDING] Polling: Mise à jour de la session...');
        update();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [status, session, update]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session || !session.user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full">
            <PartyPopper className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Bienvenue, {session.user.name} !</CardTitle>
          <CardDescription className="text-muted-foreground">
            Votre compte a été créé avec succès.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              Votre professeur doit maintenant vous assigner à une classe.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cette page se rafraîchira automatiquement.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t pt-6">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
