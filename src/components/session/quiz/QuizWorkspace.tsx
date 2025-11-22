// src/components/session/quiz/QuizWorkspace.tsx
'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { QuizLauncher } from './QuizLauncher';
import { QuizView } from './QuizView';
import type { Quiz, QuizResponse, QuizResults, User } from '@/types';
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';

interface QuizWorkspaceProps {
    sessionId: string;
    activeQuiz: Quiz | null;
    quizResponses: Map<string, QuizResponse>;
    quizResults: QuizResults | null;
    onStartQuiz: (quiz: CreateQuizData) => Promise<{ success: boolean; error?: string; }>;
    onEndQuiz: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    onCloseResults: () => void;
    students: User[];
}

export function QuizWorkspace({
    sessionId,
    activeQuiz,
    quizResponses,
    quizResults,
    onStartQuiz,
    onEndQuiz,
    onCloseResults,
    students,
}: QuizWorkspaceProps) {
    console.log("🛠️ [QUIZ WORKSPACE] - Affichage de l'espace de travail du quiz", { hasActiveQuiz: !!activeQuiz, hasResults: !!quizResults });

    if (!activeQuiz) {
        return (
            <div className="h-full w-full flex items-center justify-center p-4">
                <QuizLauncher onStartQuiz={onStartQuiz} />
            </div>
        );
    }
    
    return (
        <div className="h-full w-full p-4">
            <QuizView
                quiz={activeQuiz}
                responses={quizResponses}
                results={quizResults}
                onEndQuiz={onEndQuiz}
                onCloseResults={onCloseResults}
                studentsInSession={students}
                isTeacherView={true}
            />
        </div>
    );
}
