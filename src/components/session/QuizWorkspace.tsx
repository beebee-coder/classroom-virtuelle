// src/components/session/quiz/QuizWorkspace.tsx
'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { QuizLauncher } from './quiz/QuizLauncher';
import { QuizView } from './quiz/QuizView';
import type { QuizResponse, QuizResults, User, QuizWithQuestions } from '@/types'; // CORRECTION: Utiliser QuizWithQuestions
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';

interface QuizWorkspaceProps {
    sessionId: string;
    activeQuiz: QuizWithQuestions | null; // CORRECTION: Utiliser QuizWithQuestions
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
    console.log("🛠️ [QUIZ WORKSPACE] - Affichage de l'espace de travail du quiz", { 
        hasActiveQuiz: !!activeQuiz, 
        hasResults: !!quizResults,
        activeQuiz // Ajouter pour le debug
    });

    // Vérifier si activeQuiz a les questions nécessaires
    if (activeQuiz && !('questions' in activeQuiz)) {
        console.error("❌ [QUIZ WORKSPACE] - activeQuiz ne contient pas de questions!", activeQuiz);
    }

    // ✅ CORRECTION: Si les résultats sont affichés, on ne doit pas pouvoir lancer un nouveau quiz.
    // La logique de réinitialisation est gérée par onCloseResults.
    if (quizResults && activeQuiz) {
         return (
            <div className="h-full w-full p-4">
                <QuizView
                    quiz={activeQuiz} // ✅ Maintenant c'est QuizWithQuestions
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
    
    // S'il y a un quiz actif mais pas encore de résultats, on montre le dashboard du quiz
    if (activeQuiz) {
        return (
            <div className="h-full w-full p-4">
                <QuizView
                    quiz={activeQuiz} // ✅ Maintenant c'est QuizWithQuestions
                    responses={quizResponses}
                    results={null} // Pas de résultats pour l'instant
                    onEndQuiz={onEndQuiz}
                    onCloseResults={onCloseResults}
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