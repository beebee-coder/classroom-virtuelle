// src/components/session/quiz/QuizWorkspace.tsx
'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { QuizLauncher } from './QuizLauncher';
import { QuizView } from './QuizView';
import { QuizResultsView } from './QuizResultsView'; // ✅ IMPORT AJOUTÉ
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

    // ✅ CORRECTION: Si les résultats sont disponibles, on utilise QuizResultsView
    if (quizResults && activeQuiz) {
         return (
            <div className="h-full w-full p-4">
                <QuizResultsView
                    results={quizResults}
                    quiz={activeQuiz}
                    onClose={onCloseResults}
                    students={students}
                    isTeacherView={true}
                />
            </div>
        );
    }
    
    // S'il y a un quiz actif mais pas encore de résultats, on montre le dashboard du quiz
    if (activeQuiz) {
        return (
            <div className="h-full w-full p-4">
                <QuizView
                    quiz={activeQuiz}
                    responses={quizResponses}
                    onEndQuiz={onEndQuiz}
                    studentsInSession={students}
                    isTeacherView={true}
                />
            </div>
        );
    }

    // Sinon, on montre le lanceur pour créer un nouveau quiz.
    return (
        <div className="h-full w-full flex items-center justify-center p-4">
            <QuizLauncher onStartQuiz={onStartQuiz} />
        </div>
    );
}
