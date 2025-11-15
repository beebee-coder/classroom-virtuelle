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
    Target,
    Bot, // Import de l'icône Bot
} from 'lucide-react';
import type { Classroom } from '@prisma/client';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { ResetButton } from '@/components/ResetButton';
import type { Session } from "next-auth";

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
        title: "Outils IA",
        items: [
             { 
                label: "Assistant Pédagogique", 
                href: "/assistant", 
                icon: Bot,
                roles: ['PROFESSEUR', 'ELEVE'],
            },
        ]
    },
    {
        title: "Actions",
        items: [
            { 
                label: "Créer une Annonce", 
                component: CreateAnnouncementForm,
                icon: Megaphone,
                roles: ['PROFESSEUR'],
                isDialog: true,
            },
            {
                label: "Remise à zéro",
                component: ResetButton,
                icon: RefreshCw,
                roles: ['PROFESSEUR'],
                isDialog: true,
            }
        ]
    },
    {
        title: "Mon Espace",
        items: [
            {
                label: "Ma Classe",
                href: (user: Session['user']) => `/student/class/${user?.classeId}`,
                icon: Users,
                roles: ['ELEVE'],
                condition: (user: Session['user']) => !!user?.classeId,
            },
        ],
    },
    {
        title: "Accès Rapide",
        items: [
            {
                label: "Espace Parental",
                href: (user: Session['user']) => `/student/${user?.id}/parent`,
                icon: KeyRound,
                roles: ['ELEVE'],
                condition: (user: Session['user']) => !!user?.id,
            },
        ]
    },
    {
        title: "Utilisateur",
        items: [
            { 
                label: "Profil", 
                href: (user: Session['user']) => user?.role === 'PROFESSEUR' ? '/teacher/profile' : `/student/dashboard`, 
                icon: UserCircle,
                roles: ['PROFESSEUR', 'ELEVE'],
                condition: (user: Session['user']) => !!user?.id,
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
