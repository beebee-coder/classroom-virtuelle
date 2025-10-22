
// src/components/ProfileAvatar.tsx
'use client';

import { useTransition, useState, useEffect } from 'react';
import { User } from 'next-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CloudinaryUploadWidget } from '@/components/CloudinaryUploadWidget';
import { updateUserProfileImage } from '@/lib/actions/user.actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ImageDebugger } from './ImageDebugger';

interface ProfileAvatarProps {
  user: User;
  isInteractive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ProfileAvatar({ user, isInteractive = false, className, children }: ProfileAvatarProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { update, data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [debugImageUrl, setDebugImageUrl] = useState<string | null>(null);

  const handleUploadSuccess = (result: any) => {
   // console.log('=== DÉBUT UPLOAD AVATAR ===');
    
    if (result.event === 'success') {
      const imageUrl = result.info.secure_url || result.info.url;
     // console.log('🖼️ [AVATAR] URL image extraite:', imageUrl);
      
      if (!imageUrl) {
       // console.error('❌ [AVATAR] Aucune URL valide trouvée');
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Aucune URL d\'image valide reçue.'
        });
        return;
      }

      setIsUploading(true);
      setDebugImageUrl(imageUrl);

      startTransition(async () => {
        try {
         // console.log('🚀 [AVATAR] Début transition - appel action serveur...');
          
          await updateUserProfileImage(imageUrl);
         // console.log('✅ [AVATAR] Action serveur terminée.');

         // console.log('🔄 [AVATAR] Mise à jour session NextAuth...');
          await update({ image: imageUrl });
         // console.log('✅ [AVATAR] Session mise à jour.');

          toast({
            title: '✅ Photo mise à jour!',
            description: 'Votre photo de profil a été changée avec succès.',
          });

         // console.log('=== UPLOAD AVATAR RÉUSSI ===');

        } catch (error) {
         // console.error('❌ [AVATAR] Erreur lors de la mise à jour:', error);
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: error instanceof Error ? error.message : "Impossible de mettre à jour l'image de profil.",
          });
        } finally {
          setIsUploading(false);
          // Hide debugger after a delay
          setTimeout(() => setDebugImageUrl(null), 5000);
        }
      });
    }
  };

  const currentImageUrl = session?.user?.image ?? user.image ?? null;
 // console.log('🖼️ [AVATAR] Image actuelle à afficher:', currentImageUrl);

  const interactiveAvatar = (
    <>
    {debugImageUrl && <ImageDebugger imageUrl={debugImageUrl} />}
    <CloudinaryUploadWidget onUpload={handleUploadSuccess}>
      {({ open, loaded }) => (
        <div className="relative">
          <div 
            onClick={(e) => {
              if (!loaded || isUploading) return;
              e.preventDefault();
              e.stopPropagation();
             // console.log('📸 [AVATAR] Ouverture widget...');
              open();
            }} 
            className={cn(
              "relative group",
              loaded && !isUploading && "cursor-pointer",
              (!loaded || isUploading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {children ? (
              <div onClick={open}>{children}</div>
            ) : (
              <>
                <Avatar className={cn(
                  "h-10 w-10 transition-all duration-200",
                  loaded && !isUploading && "ring-2 ring-transparent hover:ring-blue-500",
                  className
                )}>
                  {currentImageUrl ? (
                    <>
                      <AvatarImage 
                        src={currentImageUrl} 
                        alt={user.name || 'Avatar'} 
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gray-100">
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-gray-100">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        user.name?.charAt(0) || 'U'
                      )}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {loaded && !isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </CloudinaryUploadWidget>
    </>
  );

  const staticAvatar = (
    <Avatar className={cn("h-10 w-10", className)}>
      {currentImageUrl ? (
        <>
          <AvatarImage 
            src={currentImageUrl} 
            alt={user.name || 'Avatar'} 
            className="object-cover"
          />
          <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
        </>
      ) : (
        <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
      )}
    </Avatar>
  );

  return isInteractive ? interactiveAvatar : staticAvatar;
}
