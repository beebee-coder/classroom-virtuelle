// src/components/LoginForm.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
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
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');
  const role = searchParams.get('role');
  const initialEmail = role === 'student' ? 'student1@example.com' : role === 'teacher' ? 'teacher@example.com' : '';
  const emailPlaceholder = role === 'student' ? 'student@example.com' : 'teacher@example.com';

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('password'); // Demo password
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail]);

  useEffect(() => {
    if (errorParam === 'CredentialsSignin') {
      setError("Identifiants incorrects. Le mot de passe par défaut est 'password'.");
    } else if (errorParam) {
      setError("Une erreur de connexion est survenue.");
    }
  }, [errorParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn('credentials', {
        redirect: true,
        email,
        password,
        callbackUrl: searchParams.get('callbackUrl') || '/',
      });
      // If signIn is successful, the page will redirect and this part of the
      // code will not be reached. If it fails, NextAuth redirects back to
      // this page with an `error` URL parameter, which is handled by the useEffect.
    } catch (err) {
      // This will catch network errors or other unexpected issues.
      setError("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Entrez vos identifiants ou utilisez Google pour accéder à votre tableau de bord.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
             <Button 
                variant="outline" 
                className="w-full"
                onClick={() => signIn('google', { callbackUrl: '/' })}
                disabled={loading}
              >
               <GoogleIcon /> Se connecter avec Google
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    OU
                    </span>
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              {error && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur de connexion</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                 </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>
            </form>
        </div>
      </CardContent>
    </Card>
  );
}
