// src/app/register/register-form.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { signIn } from 'next-auth/react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, User, Lock, School, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const registerSchema = z.object({
    name: z.string().min(2, { message: "Le nom est requis" }),
    email: z.string().email({ message: "Adresse email invalide" }),
    password: z.string().min(6, { message: "Le mot de passe doit faire au moins 6 caractères" }),
});

export default function RegisterForm() {
    const router = useRouter();
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: { name: '', email: '', password: '' },
    });

    const onSubmit = async (values: z.infer<typeof registerSchema>) => {
        startTransition(async () => {
            setError('');
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                // Inscription réussie, connecter l'utilisateur
                const signInResponse = await signIn('credentials', {
                    email: values.email,
                    password: values.password,
                    redirect: false,
                });
                if (signInResponse?.ok) {
                    router.push('/student/validation-pending');
                } else {
                    setError("Erreur lors de la connexion après l'inscription.");
                }
            } else {
                const data = await response.json();
                setError(data.error || 'Une erreur est survenue.');
            }
        });
    };
    
    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl: "/student/dashboard" });
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
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <School className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl font-bold tracking-tight">Classroom Connector</h1>
                    </div>
                    <p className="text-lg text-muted-foreground">Créez votre compte pour commencer.</p>
                </div>
                <Card className="shadow-2xl bg-card/80 backdrop-blur-sm border-white/20">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <CardContent className="p-8 space-y-6">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Erreur d'inscription</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="name">Nom complet</Label>
                                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><FormControl><Input id="name" className="pl-10 h-12 bg-muted/50" {...field} /></FormControl></div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><FormControl><Input id="email" type="email" className="pl-10 h-12 bg-muted/50" {...field} /></FormControl></div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem>
                                        <Label htmlFor="password">Mot de passe</Label>
                                        <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><FormControl><Input id="password" type="password" className="pl-10 h-12 bg-muted/50" {...field} /></FormControl></div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <div className="flex items-center my-4">
                                    <div className="flex-grow border-t border-muted"></div><span className="px-4 text-sm text-muted-foreground">ou</span><div className="flex-grow border-t border-muted"></div>
                                </div>
                                <Button type="button" variant="outline" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2" disabled={isPending}>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Continuer avec Google
                                </Button>
                            </CardContent>
                            <CardFooter className="bg-background/20 p-6 flex-col gap-4">
                                <Button type="submit" className="w-full font-semibold text-lg py-7" disabled={isPending}>
                                    {isPending ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Inscription...</>) : "S'inscrire"}
                                </Button>
                                <div className="text-center w-full">
                                    <Link href="/login" className="text-sm text-primary hover:underline">Déjà un compte ? Connectez-vous</Link>
                                </div>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
