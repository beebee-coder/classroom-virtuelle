// src/app/register/register-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Mail, Lock, School, ArrowLeft, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageParam = searchParams?.get('message');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState<string | null>(null);

  useEffect(() => {
    if (messageParam === 'account_not_found') {
      setContextMessage("Il semble que vous n'ayez pas encore de compte. Veuillez vous inscrire pour continuer.");
    }
  }, [messageParam]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      if (res.ok) {
        // Rediriger vers la page de login avec un message de succès
        router.push('/login?message=registration_success');
      } else {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue lors de l'inscription.");
      }
    } catch (err) {
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = () => {
    setLoading(true);
    // Redirige vers le dashboard après connexion/inscription
    signIn('google', { callbackUrl: '/teacher/dashboard' });
  };

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
            <h1 className="text-4xl font-bold tracking-tight">Classroom Connector</h1>
          </div>
          <p className="text-lg text-muted-foreground">Créez votre compte pour commencer.</p>
        </div>

        {contextMessage && (
          <Alert className="mb-6 max-w-md mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>{contextMessage}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-8 space-y-6">
               {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erreur d'inscription</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
                <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <FaGoogle className="h-4 w-4 mr-2" />
                    Continuer avec Google
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

              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
            </CardContent>
            <CardFooter className="bg-background/20 p-6 flex-col gap-4">
              <Button
                type="submit"
                className="w-full font-semibold text-lg py-7"
                disabled={loading || !name || !email || !password}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "S'inscrire"}
              </Button>
              <div className="text-center w-full">
                <Link href="/login" className="text-sm text-primary hover:underline">
                  Déjà un compte ? Connectez-vous
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
