// src/app/login/login-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Mail, Lock, School, ArrowLeft, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';
import { ValidationStatus } from '@prisma/client';

type LoginFormProps = {
  ownerExists: boolean;
};

export default function LoginForm({ ownerExists }: LoginFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const errorParam = searchParams?.get('error');
  const messageParam = searchParams?.get('message');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Redirection automatique si session active
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      console.log('[LOGIN_FORM] Session authentifiée, préparation à la redirection...');
      const { role, validationStatus, isNewUser } = session.user as any;
      let targetUrl = '/';

      if (role === 'PROFESSEUR') {
        targetUrl = '/teacher/dashboard';
      } else if (role === 'ELEVE') {
        if (isNewUser) {
          targetUrl = '/student/onboarding';
        } else {
          targetUrl = validationStatus === ValidationStatus.PENDING ? '/student/onboarding' : '/student/dashboard';
        }
      }
      
      console.log(`[LOGIN_FORM] Redirection vers: ${targetUrl}`);
      router.push(targetUrl);
    }
  }, [status, session, router]);

  // Gestion des messages d'erreur/succès venant des paramètres URL
  useEffect(() => {
    if (errorParam) {
      console.log('[LOGIN_FORM] Erreur de NextAuth détectée:', errorParam);
      if (errorParam === 'CredentialsSignin') {
        setError("Email ou mot de passe incorrect pour le compte professeur.");
      } else if (errorParam === 'OAuthAccountNotLinked') {
        setError("Ce compte email est déjà utilisé. Veuillez utiliser un autre compte pour vous connecter.");
      }
      else {
        setError("Une erreur de connexion est survenue. Veuillez réessayer.");
      }
    }
    if (messageParam === 'registration_success') {
      console.log('[LOGIN_FORM] Message de succes inscription recu.');
      setInfoMessage("Compte professeur créé ! Veuillez vous connecter avec vos identifiants.");
    }
    if (messageParam === 'owner_google_attempt') {
        setError("Cet email est réservé au professeur. Veuillez vous connecter avec votre mot de passe.");
    }
  }, [errorParam, messageParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage(null);
    console.log(`[LOGIN_FORM] Tentative de connexion pour: ${email}`);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });
    console.log('[LOGIN_FORM] Résultat de signIn (credentials):', result);

    if (result?.ok) {
      console.log('[LOGIN_FORM] Connexion réussie. Rafraîchissement de la session...');
      router.refresh(); 
    } else {
      console.log(`[LOGIN_FORM] Échec de la connexion: ${result?.error}`);
      setError(result?.error === 'CredentialsSignin' ? 'Email ou mot de passe incorrect.' : 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    console.log('[LOGIN_FORM] Connexion élève avec Google...');
    signIn('google');
  };

  if (status === "loading" || (status === 'authenticated' && session)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className='ml-2 text-muted-foreground'>Chargement...</p>
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
            {ownerExists ? "Connectez-vous pour commencer votre session." : "Veuillez d'abord créer le compte professeur."}
          </p>
        </div>

        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur de connexion</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {infoMessage && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>{infoMessage}</AlertDescription>
              </Alert>
            )}

            {ownerExists ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-2 text-base"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <FaGoogle className="h-5 w-5 mr-2" />
                  Élèves : Connexion / Inscription Google
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground font-semibold">
                    Professeur (Propriétaire)
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Mettre votre email"
                        className="pl-10 h-12"
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
                        placeholder="Mettre votre mot de passe"
                        className="pl-10 h-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-semibold h-12 text-base"
                    disabled={loading || !email || !password}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Se connecter"}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center">
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Action requise</AlertTitle>
                    <AlertDescription>
                      Aucun compte professeur n'a été trouvé. Veuillez d'abord créer le compte principal.
                    </AlertDescription>
                 </Alert>
                 <Button asChild className="mt-4 w-full">
                    <Link href="/register">
                      Créer le compte Professeur
                    </Link>
                 </Button>
              </div>
            )}
          </CardContent>
           {ownerExists && (
            <CardFooter>
              <div className="text-center w-full">
                  <Link href="/register" className="text-sm text-primary hover:underline">
                      Le compte professeur n'existe pas ? S'inscrire
                  </Link>
              </div>
            </CardFooter>
           )}
        </Card>
      </div>
    </div>
  );
}
