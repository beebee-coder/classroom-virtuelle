// src/app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Lock, School, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Role } from '@prisma/client';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Composant pour gérer la logique qui utilise searchParams
function LoginFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  useEffect(() => {
    if (errorParam === 'CredentialsSignin') {
      setError("Identifiants incorrects. Vérifiez l'email et le mot de passe (le mot de passe par défaut est 'password').");
    } else if (errorParam) {
      setError("Une erreur de connexion est survenue. Veuillez réessayer.");
    }
  }, [errorParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      email: email,
      password: password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Identifiants incorrects. Assurez-vous d'utiliser les comptes de démo (ex: teacher@example.com ou ahmed0@example.com avec le mot de passe 'password').");
    } else if (result?.ok) {
      router.push('/');
      router.refresh();
    }
  };

  const handleDemoFill = (role: Role) => {
    setError('');
    setSelectedRole(role);
    if (role === 'PROFESSEUR') {
        setEmail('teacher@example.com');
    } else {
        setEmail('ahmed0@example.com');
    }
    setPassword('password');
  }

  return (
    <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
      <form onSubmit={handleSubmit}>
        <CardContent className="p-8 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur de connexion</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-center text-sm text-muted-foreground">Pour la démo, cliquez pour pré-remplir :</p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button" 
                variant={selectedRole === 'PROFESSEUR' ? "default" : "secondary"} 
                onClick={() => handleDemoFill('PROFESSEUR')}
                className="transition-transform hover:scale-105"
              >
                En tant que Professeur
              </Button>
              <Button 
                type="button" 
                variant={selectedRole === 'ELEVE' ? "default" : "secondary"} 
                onClick={() => handleDemoFill('ELEVE')}
                className="transition-transform hover:scale-105"
              >
                En tant qu'Élève
              </Button>
            </div>
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Identifiant"
              className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Mot de passe"
              className="pl-10 h-12 bg-muted/50 border-0 focus-visible:ring-primary text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="bg-background/20 p-6 flex-col gap-4">
          <Button
            type="submit"
            className="w-full font-semibold text-lg py-7 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            disabled={loading || !email || !password}
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Se connecter"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Pas encore de compte ?{' '}
            <Button variant="link" className="p-0 h-auto text-xs" asChild>
              <Link href="#">
                S'inscrire !
              </Link>
            </Button>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

// Page principale
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 relative bg-background">
       <Image
          src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=3024&auto=format&fit=crop"
          alt="Classroom background"
          fill
          className="object-cover -z-10 opacity-20"
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
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <School className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Classroom Connector
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Connectez-vous pour commencer votre session d'apprentissage.
          </p>
        </div>
        
        {/* Envelopper le composant qui utilise useSearchParams dans Suspense */}
        <Suspense fallback={<div className="text-center text-white">Chargement...</div>}>
          <LoginFormComponent />
        </Suspense>
      </div>
    </div>
  );
}
