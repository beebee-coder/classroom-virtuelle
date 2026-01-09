// src/components/ProfileAvatar.tsx
'use client';

import { useTransition, useState, KeyboardEvent } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CloudinaryUploadWidget } from '@/components/CloudinaryUploadWidget';
import { updateUserProfileImage } from '@/lib/actions/user.actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';
import { ImageDebugger } from './ImageDebugger';
import type { Session } from 'next-auth';

interface ProfileAvatarProps {
  user: Session['user'] | null;
  isInteractive?: boolean;
  className?: string;
}

export function ProfileAvatar({ user, isInteractive = false, className }: ProfileAvatarProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(user?.image);

  if (!user) {
    return null;
  }
  
  // ✅ CORRECTION : S'assurer que l'ID existe avant de générer l'URL
  const fallbackAvatarUrl = user.id 
    ? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.id}`
    : ''; // Fournir une chaîne vide si pas d'ID, que Next.js ignore sans erreur.

  const handleUploadSuccess = (result: any) => {
    if (result.event === 'success') {
      const imageUrl = result.info.secure_url || result.info.url;
      if (!imageUrl) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucune URL d\'image valide reçue.',
        });
        return;
      }

      setIsUploading(true);
      setDebugImageUrl(imageUrl);

      startTransition(async () => {
        try {
          await updateUserProfileImage(imageUrl);
          setCurrentImageUrl(imageUrl);

          toast({
            title: '✅ Photo mise à jour!',
            description: 'Votre photo de profil a été changée avec succès.',
          });
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: error instanceof Error ? error.message : "Impossible de mettre à jour l'image de profil.",
          });
        } finally {
          setIsUploading(false);
          setTimeout(() => setDebugImageUrl(null), 5000);
        }
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const widgetButton = document.querySelector('button.cloudinary-button');
      if (widgetButton) {
        (widgetButton as HTMLButtonElement).click();
      }
    }
  };

  const interactiveAvatar = (
    <>
      {debugImageUrl && <ImageDebugger imageUrl={debugImageUrl} />}
      <CloudinaryUploadWidget onUpload={handleUploadSuccess}>
        {({ open, loaded }) => (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if (!loaded || isUploading) return;
              e.preventDefault();
              e.stopPropagation();
              open();
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "relative group cursor-pointer inline-block",
              (!loaded || isUploading) && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Modifier la photo de profil"
          >
            <Avatar
              className={cn(
                "h-10 w-10 transition-all duration-200",
                loaded && !isUploading && "ring-2 ring-transparent hover:ring-blue-500",
                className
              )}
            >
              <AvatarImage
                src={currentImageUrl || fallbackAvatarUrl}
                alt={user.name || 'Avatar'}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-100">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  user.name?.charAt(0) || 'U'
                )}
              </AvatarFallback>
            </Avatar>

            {loaded && !isUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
              </div>
            )}
          </div>
        )}
      </CloudinaryUploadWidget>
    </>
  );

  const staticAvatar = (
    <Avatar className={cn("h-10 w-10", className)}>
      <AvatarImage
        src={currentImageUrl || fallbackAvatarUrl}
        alt={user.name || 'Avatar'}
        className="object-cover"
      />
      <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
    </Avatar>
  );

  return isInteractive ? interactiveAvatar : staticAvatar;
}