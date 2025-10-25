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
import type { Classroom } from '@/lib/types';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { ResetButton } from '@/components/ResetButton';
import type { DummySession } from "@/lib/session";

// Définition des éléments de menu pour une configuration centralisée
export const menuItems = [
    {
        title: "Principal",
        items: [
            { 
                label: "Tableau de Bord", 
                href: "/teacher/dashboard", 
                icon: LayoutDashboard,
                roles: ['PROFESSEUR'],
            },
            { 
                label: "Gérer les Classes", 
                href: "/teacher/classes", 
                icon: Users,
                roles: ['PROFESSEUR'],
            },
            { 
                label: "Validations", 
                href: "/teacher/validations", 
                icon: CheckCircle,
                roles: ['PROFESSEUR'],
            },
            { 
                label: "Gérer les Tâches", 
                href: "/teacher/tasks", 
                icon: Edit,
                roles: ['PROFESSEUR'],
            },
             { 
                label: "Classe du Futur", 
                href: "/teacher/future-classroom", 
                icon: Rocket,
                roles: ['PROFESSEUR'],
            },
        ],
    },
    {
        title: "Actions",
        items: [
            { 
                label: "Créer une Annonce", 
                component: CreateAnnouncementForm,
                icon: Megaphone,
                roles: ['PROFESSEUR'],
            },
            {
                label: "Remise à zéro",
                component: ResetButton,
                icon: RefreshCw,
                roles: ['PROFESSEUR'],
            }
        ]
    },
    {
        title: "Mon Espace",
        items: [
            {
                label: "Ma Classe",
                href: (user: DummySession['user']) => `/student/class/${user?.classeId}`,
                icon: Users,
                roles: ['ELEVE'],
                condition: (user: DummySession['user']) => !!user?.classeId,
            },
            {
                label: "Mon Profil de Compétences",
                href: (user: DummySession['user']) => `/student/${user?.id}/skills`,
                icon: Target,
                roles: ['ELEVE'],
                condition: (user: DummySession['user']) => !!user?.id,
            },
        ],
    },
    {
        title: "Accès Rapide",
        items: [
            {
                label: "Espace Parental",
                href: (user: DummySession['user']) => `/student/${user?.id}/parent`,
                icon: KeyRound,
                roles: ['ELEVE'],
                condition: (user: DummySession['user']) => !!user?.id,
            },
        ]
    },
    {
        title: "Utilisateur",
        items: [
            { 
                label: "Profil", 
                href: (user: DummySession['user']) => user?.role === 'PROFESSEUR' ? '/teacher/profile' : `/student/${user?.id}`, 
                icon: UserCircle,
                roles: ['PROFESSEUR', 'ELEVE'],
                condition: (user: DummySession['user']) => !!user?.id,
            },
            { 
                label: "Paramètres", 
                href: "/settings", // Lien générique pour les paramètres
                icon: Settings,
                roles: ['PROFESSEUR', 'ELEVE'],
            },
        ],
    },
];
