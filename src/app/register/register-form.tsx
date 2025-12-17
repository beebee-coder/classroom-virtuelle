// src/app/register/register-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Mail, Lock, School, ArrowLeft, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';

export default function RegisterForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const messageParam = searchParams?.get('message');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/teacher/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (messageParam === 'account_not_found') {
      setContextMessage("Il semble que vous n'ayez pas encore de compte. Veuillez vous inscrire ci-dessous.");
    }
  }, [messageParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log(`🔵 [REGISTER FORM] - Tentative d'inscription pour: ${email}`);

    if (!name || !email || !password) {
      setError('Veuillez remplir tous les champs.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || 'Une erreur est survenue lors de l’inscription.';
        setError(errorMessage);
        console.error('❌ [REGISTER FORM] - Échec inscription:', errorMessage);
        setLoading(false);
        return;
      }

      console.log('✅ [REGISTER FORM] - Inscription réussie. Redirection vers /login.');
      router.push('/login?message=registration_success');
    } catch (err: any) {
      const msg = err.message || 'Erreur inattendue.';
      setError(msg);
      console.error('❌ [REGISTER FORM] - Exception:', msg);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
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

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {/* 🔹 PAS de placeholder */}
                  <Input
                    id="name"
                    type="text"
                    className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary text-base"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {/* 🔹 PAS de placeholder */}
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {/* 🔹 PAS de placeholder */}
                  <Input
                    id="password"
                    type="password"
                    className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary text-base"
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
                className="w-full font-semibold text-lg py-7 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
                disabled={loading || !name || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Création du compte...
                  </>
                ) : (
                  "S'inscrire"
                )}
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
