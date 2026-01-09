// src/components/session/quiz/QuizResultsView.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, CheckCircle, ArrowLeft, Users, Trophy } from 'lucide-react';
import type { QuizResults, QuizQuestion, QuizOption, User, QuizWithQuestions } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuizResultsViewProps {
    results: QuizResults;
    quiz: QuizWithQuestions;
    onClose: () => void;
    students: User[];
    isTeacherView: boolean;
}

export function QuizResultsView({ results, quiz, onClose, students, isTeacherView }: QuizResultsViewProps) {
    const totalQuestions = quiz.questions.length;
    const scores = Object.entries(results.scores);
    const averageScore = scores.length > 0 ? scores.reduce((sum, [, s]) => sum + s.score, 0) / scores.length : 0;
    const participationCount = Object.keys(results.responses).length;
    const totalStudents = students.length;

    const studentMap = new Map(students.map(s => [s.id, s.name]));

    const sortedScores = scores.sort(([, a], [, b]) => b.score - a.score);

    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><BarChart /> Résultats du Quiz: {quiz.title}</CardTitle>
                        <CardDescription>Voici un résumé des performances de la classe.</CardDescription>
                    </div>
                    {isTeacherView && (
                        <Button variant="outline" onClick={onClose}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Fermer les résultats
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-lg">Statistiques Générales</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{averageScore.toFixed(1)} / {totalQuestions}</p>
                                <p className="text-xs text-muted-foreground">({(averageScore / totalQuestions * 100).toFixed(0)}%)</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Participation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{participationCount} / {totalStudents}</p>
                                <p className="text-xs text-muted-foreground">élèves ont répondu</p>
                            </CardContent>
                        </Card>
                    </div>
                     <h3 className="font-semibold text-lg mt-4">Détail par Question</h3>
                     <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4">
                            {quiz.questions.map((q: QuizQuestion) => {
                                const questionResponses = Object.values(results.responses).map(r => r.answers[q.id]);
                                const totalResponsesForQuestion = questionResponses.filter(Boolean).length;
                                return (
                                    <div key={q.id} className="p-4 border rounded-lg">
                                        <h4 className="font-semibold mb-3">{q.text}</h4>
                                        <div className="space-y-3">
                                            {(q as any).options.map((option: QuizOption) => {
                                                const count = questionResponses.filter(id => id === option.id).length;
                                                const percentage = totalResponsesForQuestion > 0 ? (count / totalResponsesForQuestion) * 100 : 0;
                                                const isCorrect = option.id === q.correctOptionId;
                                                return (
                                                    <div key={option.id}>
                                                        <div className="flex justify-between items-center mb-1 text-sm">
                                                            <span className={cn("flex items-center", isCorrect && "font-bold text-green-600")}>
                                                                {option.text} 
                                                                {isCorrect && <CheckCircle className="h-4 w-4 ml-2"/>}
                                                            </span>
                                                            <span className="text-muted-foreground">{count}</span>
                                                        </div>
                                                        <Progress value={percentage} className={cn("h-2", isCorrect ? "bg-green-400" : "bg-primary/50")} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </div>
                 <div className="flex flex-col gap-4">
                     <h3 className="font-semibold text-lg">Classement des Scores</h3>
                     <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-2">
                            {sortedScores.map(([userId, data], index) => (
                                <div key={userId} className={cn(
                                    "flex items-center justify-between p-3 rounded-lg",
                                    index === 0 ? "bg-yellow-100 border border-yellow-300" : "bg-muted/50"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold w-6 text-center">{index + 1}.</span>
                                        <span className="text-sm font-medium">{studentMap.get(userId) || 'Élève inconnu'}</span>
                                    </div>
                                    <div className={cn(
                                        "font-semibold flex items-center gap-1 text-sm px-2 py-1 rounded-md",
                                        data.score / totalQuestions > 0.7 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                    )}>
                                        <Trophy className="h-4 w-4" /> 
                                        {data.score} / {totalQuestions}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
