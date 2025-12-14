// src/components/UserNav.tsx
"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogIn, LogOut, Sun, Moon, Monitor, Camera } from "lucide-react";
import { useTheme } from "next-themes";
import { ProfileAvatar } from "./ProfileAvatar";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useRef } from "react";

interface UserNavProps {
    user?: Session['user'] | null;
}

export function UserNav({ user }: UserNavProps) {
    const { setTheme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    const handlePhotoChange = () => {
        // ⚠️ Cette logique peut être étendue plus tard (ex: uploader via API)
        // Pour l'instant, on ouvre juste le sélecteur de fichiers
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // TODO: Intégrer avec une mutation API (ex: updateProfilePicture)
            console.log("📸 Fichier photo sélectionné :", file.name);
            // Pour l'instant, on ne fait rien côté serveur — mais l'UX est claire
        }
    };

    if (!user) {
        return (
            <Button asChild>
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                    Connexion
                </Link>
            </Button>
        );
    }

    return (
        <>
            {/* Input caché pour le changement de photo */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                accept="image/*"
                className="hidden"
                aria-label="Changer la photo de profil"
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
                        <ProfileAvatar user={user} isInteractive={false} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                            <Link href={user.role === 'PROFESSEUR' ? '/teacher/profile' : '/student/dashboard'}>
                                Profil
                            </Link>
                        </DropdownMenuItem>

                        {/* ✅ Correction : MenuItem classique qui déclenche l'upload */}
                        <DropdownMenuItem onClick={handlePhotoChange}>
                            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                            Changer la photo
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Thème</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setTheme("light")}>
                                        <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
                                        <span>Clair</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                                        <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
                                        <span>Sombre</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")}>
                                        <Monitor className="mr-2 h-4 w-4" aria-hidden="true" />
                                        <span>Système</span>
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>

                        {/* ⚠️ Désactivé car non implémenté — évite la confusion */}
                        <DropdownMenuItem disabled>
                            Paramètres
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                        Se déconnecter
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}