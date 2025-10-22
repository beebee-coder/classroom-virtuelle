
import type { Prisma, Reaction as PrismaReaction, Message as PrismaMessage, StudentProgress, Announcement as PrismaAnnouncement, Classroom, User, Metier, CoursSession, Leaderboard, Task, ProgressStatus, ValidationType } from '@prisma/client';

export type { ValidationType };

export type ClassroomWithUsers = Prisma.ClassroomGetPayload<{
    include: { eleves: true, professeur: true }
}>

export type StudentWithStateAndCareer = Prisma.UserGetPayload<{
    include: {
        etat: {
            include: {
                metier: true
            }
        },
        classe: true,
        progress: {
            include: {
                task: true
            }
        },
        sessionsParticipees: {
            where: {
                endedAt: null
            }
        }
    }
}>

export type ReactionWithUser = Prisma.ReactionGetPayload<{
    include: {
        user: {
            select: { name: true, id: true }
        }
    }
}>;

export type MessageWithReactions = PrismaMessage & {
    reactions: ReactionWithUser[];
};


export type AppTask = Task;


export type FullConversation = Prisma.ConversationGetPayload<{
    include: {
        messages: {
            orderBy: {
                createdAt: 'asc'
            }
        };
        initiator: { 
            select: { id: true, name: true }
        };
        receiver: { 
            select: { id: true, name: true }
        };
    }
}>

export type AnnouncementWithAuthor = PrismaAnnouncement & {
    author: {
        name: string | null;
    }
};

export type StudentForCard = Pick<User, 'id' | 'name' | 'email' | 'points'> & {
  etat: {
    isPunished: boolean;
  } | null;
};

export type StudentWithCareer = Pick<User, 'id' | 'name' | 'email'> & {
    etat: {
        metier: Metier | null;
    } | null
}

export type ClassroomWithDetails = Omit<Classroom, 'professeurId'> & {
  eleves: StudentForCard[];
};

export type CareerWithTheme = Metier & {
  theme: {
    backgroundColor: string;
    textColor: string;
    primaryColor: string;
    accentColor: string;
    cursor: string;
    imageUrl: string;
  }
}

export type CoursSessionWithRelations = CoursSession & {
    participants: User[];
    professeur: User;
    classe: Classroom | null;
    spotlightedParticipantId?: string | null;
};



// Competition System Types
export type { StudentProgress, Leaderboard } from '@prisma/client';


// Validation Types
export type TaskForProfessorValidation = StudentProgress & {
  task: Task;
  student: {
    id: string;
    name: string | null;
  };
};
