// src/app/register/register-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Mail, Lock, School, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';
interface RegisterFormProps {
    ownerExists: boolean;
}

export default function RegisterForm({ ownerExists }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Détecter l'erreur métier depuis l'URL
  const teacherEmailError = searchParams.get('error') === 'teacher_email_reserved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log(`[REGISTER_FORM] 🔵 Soumission du formulaire pour: ${email}`);

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
        console.log('[REGISTER_FORM] ✅ Inscription réussie. Redirection vers login.');
        router.push('/login?message=registration_success');
      } else {
        const data = await res.json();
        console.log(`[REGISTER_FORM] ❌ Échec de l'inscription:`, data.error);
        setError(data.error || "Une erreur est survenue lors de l'inscription.");
      }
    } catch (err) {
      console.log('[REGISTER_FORM] 💥 Erreur réseau:', err);
      setError("Une erreur réseau est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Optionnel : on peut effacer l'erreur en relançant
    signIn('google');
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
          <p className="text-lg text-muted-foreground">
            {ownerExists ? "Rejoignez votre classe" : "Création du Compte Professeur"}
          </p>
        </div>
        
        <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
          <CardContent className="p-8 space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur d'inscription</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {ownerExists ? (
              <div className="text-center space-y-4">
                {teacherEmailError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email réservé</AlertTitle>
                    <AlertDescription>
                      Cet email est réservé au professeur. Veuillez utiliser un compte Google élève pour rejoindre une classe.
                    </AlertDescription>
                  </Alert>
                )}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Élèves : Inscription via Google</AlertTitle>
                  <AlertDescription>
                    Pour rejoindre une classe, veuillez vous inscrire ou vous connecter en utilisant votre compte Google.
                  </AlertDescription>
                </Alert>
                <Button 
                  className="w-full h-12 text-base" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <FaGoogle className="mr-2 h-5 w-5" />
                  {teacherEmailError ? "Réessayer avec un autre compte" : "S'inscrire / Se connecter avec Google"}
                </Button>
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Information importante</AlertTitle>
                  <AlertDescription>
                    Cette page est exclusivement réservée à la création du compte professeur (propriétaire).
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        className="pl-10 h-12"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email du propriétaire</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
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
                    disabled={loading || !name || !email || !password}
                  >
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Créer le compte Professeur"}
                  </Button>
                </form>
              </>
            )}

          </CardContent>
          <CardFooter className="bg-background/20 p-6 flex-col gap-4">
            <div className="text-center w-full">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Déjà un compte ? Connectez-vous
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}