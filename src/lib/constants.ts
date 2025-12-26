// src/lib/constants.ts
import {
    LayoutDashboard,
    Users,
    Edit,
    CheckCircle,
    Rocket,
    Megaphone,
    UserCircle,
    Settings,
    RefreshCw,
    KeyRound,
    Bot,
    Folder,
    type LucideIcon,
    Award,
    FileText,
} from 'lucide-react';
import { Role } from '@prisma/client';
import type { Session } from "next-auth";

// ✅ CORRECTION : L'item de menu ne référence plus de composant, mais peut avoir une 'action'
export interface MenuItem {
    label: string;
    href?: string | ((user: Session['user']) => string); // Le href peut être une fonction
    icon: LucideIcon;
    roles: Role[];
    isDialog?: boolean;
    action?: 'create-announcement' | 'reset-data'; // ✅ NOUVEAU: Identifiant d'action
    condition?: (user: Session['user']) => boolean;
}

export interface MenuSection {
    title: string;
    items: MenuItem[];
}

export const menuItems: MenuSection[] = [
    {
        title: "Principal",
        items: [
            { 
                label: "Tableau de Bord", 
                href: "/teacher/dashboard", 
                icon: LayoutDashboard,
                roles: [Role.PROFESSEUR],
            },
            { 
                label: "Gérer les Classes", 
                href: "/teacher/classes", 
                icon: Users,
                roles: [Role.PROFESSEUR],
            },
            { 
                label: "Validations", 
                href: "/teacher/validations", 
                icon: CheckCircle,
                roles: [Role.PROFESSEUR],
            },
            { 
                label: "Bibliothèque", 
                href: "/teacher/resources", 
                icon: Folder,
                roles: [Role.PROFESSEUR],
            },
            { 
                label: "Gérer les Tâches", 
                href: "/teacher/tasks", 
                icon: Edit,
                roles: [Role.PROFESSEUR],
            },
            { 
                label: "Classe du Futur", 
                href: "/teacher/future-classroom", 
                icon: Rocket,
                roles: [Role.PROFESSEUR],
            },
        ],
    },
    {
        title: "Outils IA",
        items: [
            { 
                label: "Assistant Pédagogique", 
                href: "/assistant", 
                icon: Bot,
                roles: [Role.PROFESSEUR, Role.ELEVE],
            },
        ]
    },
    {
        title: "Actions",
        items: [
            { 
                label: "Créer une Annonce", 
                icon: Megaphone,
                roles: [Role.PROFESSEUR],
                isDialog: true,
                action: 'create-announcement', // ✅ Action identifiée
            },
            {
                label: "Remise à zéro",
                icon: RefreshCw,
                roles: [Role.PROFESSEUR],
                isDialog: true,
                action: 'reset-data', // ✅ Action identifiée
            }
        ]
    },
    {
        title: "Mon Espace",
        items: [
             // Le lien est dynamique en fonction de l'ID de la classe de l'élève
            {
                label: "Ma Classe",
                href: (user) => user.classeId ? `/student/class/${user.classeId}` : '/student/dashboard',
                icon: Users,
                roles: [Role.ELEVE],
                condition: (user) => !!user.classeId,
            },
        ],
    },
    {
        title: "Accès Rapide",
        items: [
             // Le lien est dynamique en fonction de l'ID de l'élève
            {
                label: "Espace Parental",
                href: (user) => `/student/${user.id}/parent`,
                icon: KeyRound,
                roles: [Role.ELEVE],
            },
        ]
    },
    {
        title: "Utilisateur",
        items: [
            { 
                label: "Profil", 
                href: (user) => user.role === 'PROFESSEUR' ? '/teacher/profile' : `/student/${user.id}`,
                icon: UserCircle,
                roles: [Role.PROFESSEUR, Role.ELEVE],
            },
            { 
                label: "Paramètres", 
                href: "/settings", 
                icon: Settings,
                roles: [Role.PROFESSEUR, Role.ELEVE],
            },
        ],
    },
];

export const toolPresets = {
    DEFAULT: [
      { id: 'camera', name: 'Caméras', icon: Users, colors: ['#4ade80', '#fbbf24'] },
      { id: 'whiteboard', name: 'Tableau', icon: Edit, colors: ['#38bdf8', '#818cf8'] },
      { id: 'document', name: 'Document', icon: FileText, colors: ['#f472b6', '#c084fc'] },
      { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#2dd4bf', '#a78bfa'] },
    ],
} as const;
