// src/lib/types.ts - Version corrigée

import type { 
    Prisma, 
    Classroom, 
    User, 
    Metier, 
    CoursSession, 
    Leaderboard, 
    Task, 
    StudentProgress, 
    Reaction, 
    Message, 
    Announcement, 
    Conversation
} from '@prisma/client';

import {
    Role,
    TaskType,
    TaskCategory,
    TaskDifficulty,
    ValidationType,
    ProgressStatus
} from '@prisma/client';

// Ré-exporter les types et énumérations de Prisma pour un accès centralisé
export { 
    type Prisma, 
    type Classroom, 
    type User, 
    type Metier, 
    type CoursSession, 
    type Leaderboard, 
    type Task, 
    type StudentProgress, 
    type Reaction, 
    type Message, 
    type Announcement, 
    type Conversation,
    Role,
    TaskType,
    TaskCategory,
    TaskDifficulty,
    ValidationType,
    ProgressStatus
};


/**
 * Type pour un élève avec son état actuel et le métier choisi.
 * Inclut les relations vers la classe, la progression des tâches et les sessions.
 */
export type StudentWithStateAndCareer = Prisma.UserGetPayload<{
    include: {
        etat: {
            include: {
                metier: true
            }
        },
        classe: true,
        progress: true,
        sessionsParticipees: true
    }
}> & {
    // Assurer la compatibilité avec les données simulées
    progress?: StudentProgress[];
    sessionsParticipees?: any[];
};

/**
 * Type pour une réaction avec les informations de l'utilisateur qui a réagi.
 */
export type ReactionWithUser = Prisma.ReactionGetPayload<{
    include: {
        user: {
            select: { name: true, id: true }
        }
    }
}>;

/**
 * Type pour un message, incluant l'auteur et toutes les réactions associées.
 */
export type MessageWithReactions = Prisma.MessageGetPayload<{
    include: {
        sender: {
            select: { id: true, name: true, image: true }
        },
        reactions: {
            include: {
                user: {
                    select: { id: true, name: true }
                }
            }
        }
    }
}>;

/**
 * Type de base pour une tâche, utilisé dans l'application.
 */
export type AppTask = Task;

/**
 * Type pour une conversation complète, incluant les deux participants et tous les messages.
 */
export type FullConversation = Prisma.ConversationGetPayload<{
    include: {
        messages: {
            orderBy: {
                createdAt: 'asc'
            },
            include: {
                sender: {
                    select: { id: true, name: true, image: true }
                },
                reactions: true
            }
        };
        initiator: { 
            select: { id: true, name: true, image: true }
        };
        receiver: { 
            select: { id: true, name: true, image: true }
        };
    }
}>

/**
 * Type pour une annonce avec les informations sur son auteur.
 */
export type AnnouncementWithAuthor = Prisma.AnnouncementGetPayload<{
    include: {
        author: {
            select: { name: true }
        }
    }
}>;

/**
 * Type simplifié d'un élève pour affichage dans des cartes.
 * Contient les informations essentielles.
 */
export type StudentForCard = Pick<User, 'id' | 'name' | 'email' | 'points' | 'image'> & {
  etat: {
    isPunished: boolean;
  } | null;
};

/**
 * Type pour une classe avec la liste détaillée de ses élèves.
 */
export type ClassroomWithDetails = Omit<Classroom, 'professeurId'> & {
  eleves: StudentForCard[];
};

/**
 * Type pour un métier avec le thème parsé.
 */
export type CareerWithTheme = Metier & {
  theme: {
    backgroundColor: string;
    textColor: string;
    primaryColor: string;
    accentColor: string;
    cursor: string;
    imageUrl?: string;
  }
}

/**
 * Type pour une session de cours, incluant les participants, le professeur et la classe.
 */
export type CoursSessionWithRelations = Prisma.CoursSessionGetPayload<{
    include: {
        participants: {
            include: {
                user: true
            }
        },
        professeur: true,
        classe: true
    }
}>;

/**
 * Type pour la validation d'une tâche par un professeur.
 * Contient la progression, la tâche et l'élève concerné.
 */
export type TaskForProfessorValidation = Prisma.StudentProgressGetPayload<{
  include: {
    task: true;
    student: {
      select: {
        id: true;
        name: true;
      }
    };
  }
}>;

// Types utilitaires pour résoudre les problèmes de compatibilité
export interface StudentState {
    id: string;
    eleveId: string;
    isPunished: boolean;
    metierId: string | null;
    metier: Metier | null;
}

export interface StudentClass {
    id: string;
    nom: string;
    professeurId: string;
}

// Type alternatif pour les données simulées
export type SimulatedStudent = Omit<StudentWithStateAndCareer, 'progress' | 'sessionsParticipees'> & {
    progress: StudentProgress[];
    sessionsParticipees: any[];
};
