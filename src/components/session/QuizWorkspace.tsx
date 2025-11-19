// src/components/session/QuizWorkspace.tsx
'use client';

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Award } from 'lucide-react';
import { QuizLauncher } from './quiz/QuizLauncher';
import { QuizView } from './quiz/QuizView';
import type { Quiz, QuizResponse, QuizResults, User } from '@/types';

interface QuizWorkspaceProps {
    sessionId: string;
    activeQuiz: Quiz | null;
    quizResponses: Map<string, QuizResponse>;
    quizResults: QuizResults | null;
    onStartQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'createdById'>) => Promise<{ success: boolean; error?: string; }>;
    onEndQuiz: (quizId: string) => Promise<{ success: boolean; }>;
    students: User[];
}

export function QuizWorkspace({
    sessionId,
    activeQuiz,
    quizResponses,
    quizResults,
    onStartQuiz,
    onEndQuiz,
    students,
}: QuizWorkspaceProps) {

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
                studentsInSession={students}
                isTeacherView={true}
            />
        </div>
    );
}
