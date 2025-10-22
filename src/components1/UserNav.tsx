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
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import Link from "next/link"
import { LogIn, LogOut, Sun, Moon, Monitor, Camera } from "lucide-react"
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { User } from "next-auth";
import { ProfileAvatar } from "./ProfileAvatar";

interface UserNavProps {
    user?: User | null;
}

export function UserNav({ user }: UserNavProps) {
    const { setTheme } = useTheme();

    if (!user) {
        return (
            <Button asChild>
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Connexion
                </Link>
            </Button>
        )
    }
    
    return (
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
                        <Link href={user.role === 'PROFESSEUR' ? '/teacher/profile' : `/student/${user.id}`}>
                            Profil
                        </Link>
                    </DropdownMenuItem>
                    <ProfileAvatar user={user} isInteractive={true}>
                         <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Camera className="mr-2" />
                            Changer la photo
                        </DropdownMenuItem>
                    </ProfileAvatar>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            Thème
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                             <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="mr-2 h-4 w-4" />
                                <span>Clair</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="mr-2 h-4 w-4" />
                                <span>Sombre</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")}>
                                <Monitor className="mr-2 h-4 w-4" />
                                <span>Système</span>
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem>
                        Paramètres
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    <LogOut className="mr-2" />
                    Se déconnecter
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
