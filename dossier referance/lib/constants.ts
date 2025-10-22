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
    Shield,
    KeyRound,
    Target
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { ResetButton } from '@/components/ResetButton';
import type { User } from 'next-auth';

// Définition des éléments de menu pour une configuration centralisée
export const menuItems = [
    {
        title: "Principal",
        items: [
            { 
                label: "Tableau de Bord", 
                href: "/teacher", 
                icon: LayoutDashboard,
                roles: ['PROFESSEUR'] as Role[],
            },
            { 
                label: "Gérer les Classes", 
                href: "/teacher/classes", 
                icon: Users,
                roles: ['PROFESSEUR'] as Role[],
            },
            { 
                label: "Validations", 
                href: "/teacher/validations", 
                icon: CheckCircle,
                roles: ['PROFESSEUR'] as Role[],
            },
            { 
                label: "Gérer les Tâches", 
                href: "/teacher/tasks", 
                icon: Edit,
                roles: ['PROFESSEUR'] as Role[],
            },
             { 
                label: "Classe du Futur", 
                href: "/teacher/future-classroom", 
                icon: Rocket,
                roles: ['PROFESSEUR'] as Role[],
            },
        ],
    },
    {
        title: "Actions",
        items: [
            { 
                label: "Créer une Annonce", 
                component: CreateAnnouncementForm,
                roles: ['PROFESSEUR'] as Role[],
            },
            {
                label: "Remise à zéro",
                component: ResetButton,
                roles: ['PROFESSEUR'] as Role[],
            }
        ]
    },
    {
        title: "Mon Espace",
        items: [
            {
                label: "Ma Classe",
                href: (user: User) => `/student/class/${user.classeId}`,
                icon: Users,
                roles: ['ELEVE'] as Role[],
                condition: (user: User) => !!user.classeId,
            },
            {
                label: "Mon Profil de Compétences",
                href: (user: User) => `/student/${user.id}/skills`,
                icon: Target,
                roles: ['ELEVE'] as Role[],
            },
        ],
    },
    {
        title: "Accès Rapide",
        items: [
            {
                label: "Espace Parental",
                href: (user: User) => `/student/${user.id}/parent`,
                icon: KeyRound,
                roles: ['ELEVE'] as Role[],
            },
        ]
    },
    {
        title: "Utilisateur",
        items: [
            { 
                label: "Profil", 
                href: (user: User) => user.role === 'PROFESSEUR' ? '/teacher/profile' : `/student/${user.id}`, 
                icon: UserCircle,
                roles: ['PROFESSEUR', 'ELEVE'] as Role[],
            },
            { 
                label: "Paramètres", 
                href: "/settings", // Lien générique pour les paramètres
                icon: Settings,
                roles: ['PROFESSEUR', 'ELEVE'] as Role[],
            },
        ],
    },
];
