// src/app/login/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Lock, School, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

// Component to handle logic that uses searchParams
function LoginFormComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);

  useEffect(() => {
    if (errorParam === 'CredentialsSignin') {
      setError("Identifiants incorrects. Le mot de passe par défaut est 'password'.");
    } else if (errorParam) {
      setError("Une erreur de connexion est survenue.");
    }
  }, [errorParam]);

  const handleDummyLogin = (role: 'teacher' | 'student') => {
    setLoading(true);
    document.cookie = `dummyRole=${role}; path=/; max-age=86400`; // Cookie expires in 1 day
    const targetPath = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    router.push(targetPath);
  };

  const handleRoleSelection = (role: 'teacher' | 'student') => {
    setSelectedRole(role);
    setEmail(role === 'teacher' ? 'teacher@example.com' : 'ahmed0@example.com');
    setPassword('password');
  }

  return (
    <Card className="shadow-2xl shadow-black/10">
        <form onSubmit={(e) => { e.preventDefault(); if(selectedRole) handleDummyLogin(selectedRole); }}>
            <CardContent className="p-6 space-y-4">
                 {error && (
                    <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur de connexion</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="email" 
                        type="email" 
                        placeholder="Identifiant" 
                        className="pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        id="password" 
                        type="password" 
                        placeholder="Mot de passe" 
                        className="pl-10 bg-muted/50 border-0 focus-visible:ring-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Checkbox id="remember-me" />
                        <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground">Se souvenir de moi</Label>
                    </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full font-semibold text-base py-6 shadow-inner-white"
                  disabled={loading || !selectedRole}
                  style={{
                    background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))',
                    color: 'hsl(var(--foreground))',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1), 0 1px 1px rgba(255,255,255,0.5) inset'
                  }}
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Se connecter
                </Button>

                {/* Sélecteur de rôle pour la démo */}
                <div className="space-y-2 pt-2">
                  <p className="text-center text-xs text-muted-foreground">Pour la démo, choisissez un rôle :</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant={selectedRole === 'teacher' ? 'default' : 'outline'} onClick={() => handleRoleSelection('teacher')}>
                      Professeur
                    </Button>
                    <Button variant={selectedRole === 'student' ? 'default' : 'outline'} onClick={() => handleRoleSelection('student')}>
                      Élève
                    </Button>
                  </div>
                </div>

            </CardContent>
            <CardFooter className="bg-muted/30 p-4 border-t">
                <p className="text-xs text-muted-foreground w-full text-center">
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

// Main page component
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 relative">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-3 mb-2">
            <School className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">
              Classroom Connector
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour commencer votre session d'apprentissage.
          </p>
        </div>
        
        {/* Wrap the component that uses searchParams in Suspense */}
        <Suspense fallback={<div className="text-center">Chargement...</div>}>
          <LoginFormComponent />
        </Suspense>
      </div>
    </div>
  );
}
