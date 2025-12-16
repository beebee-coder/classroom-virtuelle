// src/components/SettingsClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, Save } from 'lucide-react';
import { updateUserSettings } from '@/lib/actions/user.actions';
import { ProfileAvatar } from './ProfileAvatar';
import type { User as PrismaUser } from '@prisma/client';
import { useRouter } from 'next/navigation';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom doit contenir au moins 2 caractères.",
  }),
});

const passwordFormSchema = z.object({
  parentPassword: z.string().min(4, "Le mot de passe doit faire au moins 4 caractères.").optional().or(z.literal('')),
});

interface SettingsClientProps {
  user: PrismaUser;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || '',
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      parentPassword: '',
    },
  });

  function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    startProfileTransition(async () => {
      try {
        await updateUserSettings(values);
        toast({
          title: "Profil mis à jour",
          description: "Votre nom a été modifié avec succès.",
        });
        router.refresh(); // Rafraîchit les données du serveur
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de mettre à jour le profil.",
        });
      }
    });
  }

  function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    startPasswordTransition(async () => {
      try {
        await updateUserSettings({ parentPassword: values.parentPassword });
        toast({
          title: "Mot de passe parental mis à jour",
          description: "Le mot de passe pour l'espace parent a été modifié.",
        });
        passwordForm.reset();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de mettre à jour le mot de passe parental.",
        });
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'><User />Informations du Profil</CardTitle>
          <CardDescription>Mettez à jour votre nom et votre photo de profil.</CardDescription>
        </CardHeader>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                  <ProfileAvatar user={user} isInteractive={true} className="h-20 w-20" />
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Nom complet</FormLabel>
                        <FormControl>
                          <Input placeholder="Votre nom" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isProfilePending}>
                {isProfilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2"/>
                Sauvegarder les modifications
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {user.role === 'ELEVE' && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><KeyRound />Espace Parent</CardTitle>
            <CardDescription>
              Définissez ou modifiez le mot de passe pour l'espace de validation parental.
            </CardDescription>
          </CardHeader>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
              <CardContent>
                <FormField
                  control={passwordForm.control}
                  name="parentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe parental</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Laissez vide pour ne pas changer" {...field} />
                      </FormControl>
                       <FormDescription>
                        Ce mot de passe permet aux parents de valider certaines tâches. Minimum 4 caractères.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isPasswordPending}>
                  {isPasswordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2"/>
                  Mettre à jour le mot de passe
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
}
