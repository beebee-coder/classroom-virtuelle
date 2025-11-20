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
    Bot,
    Square,
    FileText,
    Award,
    Camera,
    MessageSquare,
    Calculator,
    BookOpen,
    Feather,
    Atom,
    Palette,
    Network, // Ajout de l'icône pour les groupes
} from 'lucide-react';
import type { Classroom } from '@prisma/client';
import { TaskCategory } from '@prisma/client'; // CORRECTION : Importation ajoutée
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


// --- Préréglages des Outils de Session ---

const defaultTools = [
    { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] as [string, string] },
    { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] as [string, string] },
    { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] as [string, string] },
    { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] as [string, string] },
    { id: 'breakout', name: 'Groupes', icon: Network, colors: ['#f472b6', '#ec4899'] as [string, string] },
];

export const toolPresets: Record<string, typeof defaultTools> = {
    DEFAULT: defaultTools,
    [TaskCategory.MATH]: [
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] as [string,string] },
        { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#f59e0b', '#d97706'] as [string,string] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] as [string, string] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] as [string, string] },
    ],
    [TaskCategory.LANGUAGE]: [
        { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] as [string, string] },
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] as [string,string] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] as [string, string] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] as [string, string] },
    ],
    [TaskCategory.SCIENCE]: [
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea5f1ff'] as [string,string] },
        { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] as [string, string] },
        { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#f59e0b', '#d97706'] as [string,string] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] as [string, string] },
    ],
    [TaskCategory.ART]: [
        { id: 'whiteboard', name: 'Tableau', icon: Palette, colors: ['#a955ff', '#ea51ff'] as [string, string] },
        { id: 'document', name: 'Modèles', icon: FileText, colors: ['#3b82f6', '#2563eb'] as [string, string] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] as [string, string] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] as [string, string] },
    ],
    // Vous pouvez ajouter d'autres catégories ici
};
