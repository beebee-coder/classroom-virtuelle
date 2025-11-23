// src/lib/constants.ts - VERSION CORRIGÉE
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
    Network,
    Folder,
} from 'lucide-react';
import type { Classroom } from '@prisma/client';
import { TaskCategory, Role } from '@prisma/client';
import { CreateAnnouncementForm } from '@/components/CreateAnnouncementForm';
import { ResetButton } from '@/components/ResetButton';
import type { Session } from "next-auth";

// ✅ CORRECTION : Interface améliorée pour les items de menu
export interface MenuItem {
    label: string;
    href?: string;
    component?: React.ComponentType<any>;
    icon: React.ComponentType<any>;
    roles: Role[];
    isDialog?: boolean;
    condition?: (user: Session['user']) => boolean;
}

export interface MenuSection {
    title: string;
    items: MenuItem[];
}

// ✅ CORRECTION : Définition des éléments de menu avec typage correct
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
                component: CreateAnnouncementForm,
                icon: Megaphone,
                roles: [Role.PROFESSEUR],
                isDialog: true,
            },
            {
                label: "Remise à zéro",
                component: ResetButton,
                icon: RefreshCw,
                roles: [Role.PROFESSEUR],
                isDialog: true,
            }
        ]
    },
    {
        title: "Mon Espace",
        items: [
            {
                label: "Ma Classe",
                href: "/student/class", // ✅ CORRECTION : Lien simplifié
                icon: Users,
                roles: [Role.ELEVE],
            },
        ],
    },
    {
        title: "Accès Rapide",
        items: [
            {
                label: "Espace Parental",
                href: "/student/parent", // ✅ CORRECTION : Lien simplifié
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
                href: "/profile", // ✅ CORRECTION : Lien générique
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

// ✅ CORRECTION : Interface pour les outils
export interface ToolItem {
    id: string;
    name: string;
    icon: React.ComponentType<any>;
    colors: [string, string];
}

const defaultTools: ToolItem[] = [
    { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] },
    { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] },
    { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] },
    { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] },
    { id: 'breakout', name: 'Groupes', icon: Network, colors: ['#f472b6', '#ec4899'] },
    { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#f59e0b', '#d97706'] },
];

// ✅ CORRECTION : Correction des couleurs et typage
export const toolPresets: Record<string, ToolItem[]> = {
    DEFAULT: defaultTools,
    [TaskCategory.MATH]: [
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] },
        { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#f59e0b', '#d97706'] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] },
    ],
    [TaskCategory.LANGUAGE]: [
        { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] },
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] },
    ],
    [TaskCategory.SCIENCE]: [
        { id: 'whiteboard', name: 'Tableau', icon: Square, colors: ['#a955ff', '#ea51ff'] }, // ✅ CORRECTION : Couleur fixée
        { id: 'document', name: 'Document', icon: FileText, colors: ['#3b82f6', '#2563eb'] },
        { id: 'quiz', name: 'Quiz', icon: Award, colors: ['#f59e0b', '#d97706'] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] },
    ],
    [TaskCategory.ART]: [
        { id: 'whiteboard', name: 'Tableau', icon: Palette, colors: ['#a955ff', '#ea51ff'] },
        { id: 'document', name: 'Modèles', icon: FileText, colors: ['#3b82f6', '#2563eb'] },
        { id: 'camera', name: 'Caméras', icon: Camera, colors: ['#80FF72', '#7EE8FA'] },
        { id: 'chat', name: 'Chat', icon: MessageSquare, colors: ['#22d3ee', '#06b6d4'] },
    ],
};

// ✅ CORRECTION : Export des rôles pour une utilisation cohérente
export const USER_ROLES = {
    PROFESSEUR: Role.PROFESSEUR,
    ELEVE: Role.ELEVE,
};

// ✅ CORRECTION : Constantes pour les chemins d'URL
export const APP_PATHS = {
    TEACHER: {
        DASHBOARD: '/teacher/dashboard',
        CLASSES: '/teacher/classes',
        VALIDATIONS: '/teacher/validations',
        RESOURCES: '/teacher/resources',
        TASKS: '/teacher/tasks',
        FUTURE_CLASSROOM: '/teacher/future-classroom',
        PROFILE: '/teacher/profile',
    },
    STUDENT: {
        DASHBOARD: '/student/dashboard',
        CLASS: '/student/class',
        PARENT: '/student/parent',
        PROFILE: '/student/profile',
    },
    SHARED: {
        ASSISTANT: '/assistant',
        SETTINGS: '/settings',
        PROFILE: '/profile',
    }
};