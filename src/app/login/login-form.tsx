// src/app/login/login-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Lock, School, ArrowLeft, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';

export default function LoginForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const errorParam = searchParams?.get('error');
  const messageParam = searchParams?.get('message');
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Gestion des messages et erreurs via les paramètres d'URL
  useEffect(() => {
    if (errorParam) {
      if (errorParam === 'CredentialsSignin') {
         router.push('/register?message=account_not_found');
      } else {
        setError("Une erreur de connexion est survenue. Veuillez réessayer.");
      }
    }
    if (messageParam === 'registration_success') {
      setInfoMessage("Inscription réussie ! Veuillez vous connecter avec vos identifiants.");
    }
  }, [errorParam, messageParam, router]);

  // Redirection après authentification réussie
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const { role, validationStatus } = session.user;
      let targetUrl = '/';

      if (role === 'PROFESSEUR') {
        targetUrl = '/teacher/dashboard';
      } else if (role === 'ELEVE') {
        targetUrl = validationStatus === 'PENDING' ? '/student/validation-pending' : '/student/dashboard';
      }

      console.log('🔵 [LOGIN FORM] - Redirection vers:', targetUrl);
      router.push(targetUrl);
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false, // On gère la redirection manuellement après via le useEffect
    });

    if (result && !result.ok) {
       setError(result.error === 'CredentialsSignin' ? 'Email ou mot de passe incorrect.' : 'Une erreur est survenue.');
       setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    signIn('google', { callbackUrl: '/teacher/dashboard' });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className='ml-2 text-muted-foreground'>Chargement de la session...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative bg-background">
       <Image
        src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
        alt="Classroom background"
        fill
        className="object-cover -z-10 opacity-20"
        priority
      />
      <div className="absolute top-4 left-4">
        <Button variant="ghost" asChild className="bg-background/50 backdrop-blur-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <School className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Classroom Connector
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Connectez-vous pour commencer votre session.
          </p>
        </div>

        {infoMessage && (
          <Alert className="mb-6 max-w-md mx-auto bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-700" />
            <AlertTitle className="text-green-800">Information</AlertTitle>
            <AlertDescription className="text-green-700">{infoMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur de connexion</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <FaGoogle className="mr-2 h-4 w-4" /> Continuer avec Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      ou
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-background/20 p-6 flex-col gap-4">
              <Button
                type="submit"
                className="w-full font-semibold text-lg py-7"
                disabled={loading || !email || !password}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter"}
              </Button>
              <div className="text-center w-full">
                <Link href="/register" className="text-sm text-primary hover:underline">
                  Pas encore de compte ? Inscrivez-vous
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
