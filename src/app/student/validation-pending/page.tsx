// src/app/student/validation-pending/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, Loader2 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function ValidationPendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role !== 'ELEVE' || session.user.validationStatus === 'VALIDATED') {
        router.replace('/student/dashboard');
      }
    } else if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [session, status, router]);

  if (status === 'loading' || (status === 'authenticated' && session.user.validationStatus !== 'PENDING')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Vérification du statut...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative bg-background">
        <Image
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop"
            alt="Waiting background"
            fill
            className="object-cover -z-10 opacity-20"
            priority
        />
        <main className="w-full max-w-lg">
            <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
                <CardHeader className="text-center items-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                        <Clock className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Compte en attente de validation</CardTitle>
                    <CardDescription>
                        Bonjour {session?.user?.name || 'élève'}, votre inscription est presque terminée !
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                        Votre compte doit être validé par votre enseignant avant que vous puissiez accéder à votre tableau de bord et à vos cours.
                    </p>
                    <p className="font-medium">
                        Veuillez patienter, vous serez notifié(e) lorsque votre accès sera approuvé.
                    </p>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => signOut({ callbackUrl: '/' })}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Se déconnecter
                    </Button>
                </div>
            </Card>
        </main>
    </div>
  );
}
