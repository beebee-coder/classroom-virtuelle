// src/components/LoginForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// import { signIn } from 'next-auth/react'; // ---=== BYPASS BACKEND ===---
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2, User, Lock, ArrowRight } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import Link from 'next/link';

const GoogleIcon = () => (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);


export function LoginForm() {
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
    // ---=== BYPASS BACKEND ===---
    console.log(`🚀 [BYPASS] Connexion simulée pour le rôle: ${role}`);
    
    // Set a cookie to persist the dummy session state
    document.cookie = `dummyRole=${role}; path=/; max-age=86400`; // Cookie expires in 1 day

    // Simule la connexion en redirigeant directement
    const targetPath = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
    
    // We use router.push() which is a soft navigation.
    // A full page reload (window.location.href) might also work if issues persist.
    router.push(targetPath);
    // ---=========================---
  };

  const handleRoleSelection = (role: 'teacher' | 'student') => {
    setSelectedRole(role);
    setEmail(role === 'teacher' ? 'teacher@example.com' : 'ahmed0@example.com');
    setPassword('password');
     console.log(`👤 [LOGIN] Rôle sélectionné pour la démo: ${role}`);
  }

  // Version du formulaire inspirée de l'image
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
