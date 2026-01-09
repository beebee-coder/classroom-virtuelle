// src/components/session/quiz/QuizView.tsx - VERSION SAFE (sans célébration)
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Users, CheckCircle, XCircle, Loader2, Info, Trophy, AlertCircle } from 'lucide-react';
import type { QuizResponse, User, QuizQuestion, QuizOption, QuizResults, QuizWithQuestions, QuizQuestionWithOptions } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QuizResultsView } from './QuizResultsView';

interface QuizViewProps {
    quiz: QuizWithQuestions | null;
    isTeacherView: boolean;
    onSubmitResponse?: (response: QuizResponse) => Promise<{ success: boolean; }>;
    onEndQuiz?: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    onCloseResults?: () => void; // Ajout pour la vue prof
    responses?: Map<string, QuizResponse>;
    studentsInSession?: User[];
    results?: QuizResults | null; // Ajout pour la vue prof
}

export function QuizView({ 
    quiz, 
    isTeacherView, 
    onSubmitResponse, 
    onEndQuiz, 
    responses = new Map(), 
    studentsInSession = [],
    results,
    onCloseResults,
}: QuizViewProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
    const [isSubmitting, startSubmitting] = useTransition();
    const { toast } = useToast();

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <Card className="h-full w-full flex flex-col items-center justify-center">
                <CardHeader className="text-center max-w-md">
                    <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <CardTitle className="text-lg">Quiz non disponible</CardTitle>
                    <CardDescription className="text-sm">
                        Aucun quiz n'est activement actif ou il est mal configuré.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    if (isTeacherView && results) {
        return (
            <QuizResultsView 
                results={results}
                quiz={quiz}
                onClose={onCloseResults!}
                students={studentsInSession}
                isTeacherView={true}
            />
        );
    }

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const isQuestionSubmitted = submittedAnswers[currentQuestion.id];

    const handleSelectAnswer = (questionId: string, optionId: string) => {
        if (isQuestionSubmitted) return;
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleSubmitQuestion = () => {
        const selectedOptionId = selectedAnswers[currentQuestion.id];
        if (!selectedOptionId) {
            toast({ variant: 'destructive', title: 'Aucune réponse sélectionnée' });
            return;
        }

        startSubmitting(async () => {
            if (onSubmitResponse) {
                const responsePayload: QuizResponse = {
                    userId: '',
                    userName: '',
                    answers: { [currentQuestion.id]: selectedOptionId },
                    quizId: ''
                };
                const result = await onSubmitResponse(responsePayload);
                if (result.success) {
                    setSubmittedAnswers(prev => ({ ...prev, [currentQuestion.id]: true }));
                    toast({
                        title: '✅ Réponse enregistrée',
                        description: 'Merci pour votre réponse !',
                        duration: 3000
                    });
                } else {
                    toast({ variant: 'destructive', title: '❌ Erreur', description: "Impossible d'enregistrer la réponse." });
                }
            }
        });
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    if (isTeacherView) {
        return <TeacherQuizDashboard 
            quiz={quiz} 
            responses={responses} 
            onEndQuiz={onEndQuiz} 
            studentsInSession={studentsInSession} 
        />;
    }

    // Student View
    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                    <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="flex-1 mr-3 h-2" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentQuestionIndex + 1} / {totalQuestions}
                    </span>
                </div>
                <CardTitle className="text-lg">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
                <h3 className="font-semibold mb-4 text-base">{currentQuestion.text}</h3>
                <RadioGroup onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)} value={selectedAnswers[currentQuestion.id]} disabled={isQuestionSubmitted}>
                    {currentQuestion.options.map((option: QuizOption) => {
                        const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                        const isCorrect = option.id === currentQuestion.correctOptionId;
                        let stateStyle = "";
                        if (isQuestionSubmitted) {
                            if (isCorrect) {
                                stateStyle = "bg-green-100 border-green-500 text-green-800";
                            } else if (isSelected && !isCorrect) {
                                stateStyle = "bg-red-100 border-red-500 text-red-800";
                            }
                        }

                        return (
                            <div 
                                key={option.id} 
                                className={cn(
                                    "flex items-center space-x-3 p-3 border rounded-md transition-colors",
                                    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                                    stateStyle, 
                                    !isQuestionSubmitted && "has-[:checked]:bg-accent hover:bg-muted/50"
                                )}
                            >
                                <RadioGroupItem 
                                    value={option.id} 
                                    id={option.id} 
                                    className={cn(
                                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        isQuestionSubmitted && (isCorrect ? "text-green-600" : isSelected ? "text-red-600" : "")
                                    )}
                                />
                                <Label htmlFor={option.id} className="flex-1 cursor-pointer text-sm">{option.text}</Label>
                                {isQuestionSubmitted && (
                                    isCorrect ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                                    isSelected ? <XCircle className="h-4 w-4 text-red-500" /> : null
                                )}
                            </div>
                        );
                    })}
                </RadioGroup>
            </CardContent>
            <div className="p-4 border-t bg-background/50">
                {!isQuestionSubmitted ? (
                    <Button 
                        onClick={handleSubmitQuestion} 
                        disabled={isSubmitting || !selectedAnswers[currentQuestion.id]} 
                        className="w-full h-10"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Valider ma réponse'}
                    </Button>
                ) : (
                    currentQuestionIndex < totalQuestions - 1 ? (
                        <Button onClick={handleNextQuestion} className="w-full h-10">
                            Question suivante
                        </Button>
                    ) : (
                        <div className="text-center py-2">
                            <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-semibold text-sm">Quiz terminé !</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                En attente des résultats du professeur…
                            </p>
                        </div>
                    )
                )}
            </div>
        </Card>
    );
}

function TeacherQuizDashboard({ quiz, responses = new Map(), onEndQuiz, studentsInSession = [] }: {
    quiz: QuizWithQuestions;
    responses?: Map<string, QuizResponse>;
    onEndQuiz?: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    studentsInSession?: User[];
}) {
    const totalStudents = studentsInSession.length;
    const answeredStudents = responses.size;
    const [isEnding, startEnding] = useTransition();
    const { toast } = useToast();

    const studentScores = useMemo(() => {
        const scores: Record<string, { name: string; score: number }> = {};
        studentsInSession.forEach(student => {
            if (student.role === 'ELEVE') {
                scores[student.id] = { name: student.name || 'Élève', score: 0 };
            }
        });

        responses.forEach((response, userId) => {
            let userScore = 0;
            quiz.questions.forEach((q: QuizQuestionWithOptions) => { // CORRECTION: Utiliser QuizQuestionWithOptions
                if (response.answers[q.id] === q.correctOptionId) {
                    userScore++;
                }
            });
            if (scores[userId]) {
                scores[userId].score = userScore;
            }
        });
        return Object.entries(scores).sort(([, a], [, b]) => b.score - a.score);
    }, [responses, studentsInSession, quiz.questions]);

    const handleEndQuiz = () => {
        if (!onEndQuiz) return;
        startEnding(async () => {
            try {
                await onEndQuiz(quiz.id, responses);
            } catch (error) {
                console.error('Erreur lors de la fin du quiz:', error);
                toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de finaliser le quiz." });
            }
        });
    };

    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription className="text-sm">Quiz en cours — suivez les réponses en temps réel.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded-full">
                        <Users className="h-3.5 w-3.5" />
                        {answeredStudents} / {totalStudents} élèves ont répondu
                    </div>
                </div>
                <Progress value={(totalStudents > 0 ? (answeredStudents / totalStudents) * 100 : 0)} className="mt-3 h-2" />
            </CardHeader>
            <CardContent className="flex-1 grid md:grid-cols-2 gap-5 min-h-0">
                <div className="flex flex-col gap-3">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                        <BarChart className="h-4 w-4" />
                        Réponses par question
                    </h3>
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                        <div className="space-y-3">
                            {quiz.questions.map((q: QuizQuestionWithOptions) => ( // CORRECTION: Utiliser QuizQuestionWithOptions
                                <QuestionStats key={q.id} question={q} responses={responses} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <div className="flex flex-col gap-3">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Classement
                    </h3>
                    <ScrollArea className="flex-1 pr-3 -mr-3">
                        {studentScores.length > 0 ? (
                            <div className="space-y-2">
                                {studentScores.map(([userId, data]) => (
                                    <div key={userId} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-md text-sm">
                                        <span className="font-medium truncate">{data.name}</span>
                                        <span className="font-semibold flex items-center gap-1">
                                            <Trophy className="h-3.5 w-3.5 text-yellow-600" /> 
                                            {data.score} / {quiz.questions.length}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                <AlertCircle className="h-4 w-4 mr-1.5" />
                                Aucune réponse encore
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
            <div className="p-4 border-t bg-background/50">
                <Button 
                    variant="destructive" 
                    className="w-full h-10" 
                    onClick={handleEndQuiz} 
                    disabled={isEnding}
                >
                    {isEnding ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finalisation…
                        </>
                    ) : "Terminer le quiz"}
                </Button>
            </div>
        </Card>
    );
}

function QuestionStats({ question, responses }: { question: QuizQuestionWithOptions; responses: Map<string, QuizResponse> }) {
    const optionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        question.options.forEach((o: QuizOption) => counts[o.id] = 0); // CORRECTION: Type explicite
        
        let totalResponses = 0;
        responses.forEach(response => {
            const answer = response.answers[question.id];
            if (answer && counts.hasOwnProperty(answer)) {
                counts[answer]++;
                totalResponses++;
            }
        });
        return { counts, totalResponses };
    }, [question, responses]);

    return (
        <div className="p-3 border rounded-md bg-card">
            <h4 className="font-medium text-sm mb-2 line-clamp-2">{question.text}</h4>
            <div className="space-y-2">
                {question.options.map((option: QuizOption) => {
                    const count = optionCounts.counts[option.id] || 0;
                    const percentage = optionCounts.totalResponses > 0 ? (count / optionCounts.totalResponses) * 100 : 0;
                    const isCorrect = option.id === question.correctOptionId;
                    return (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-1 text-xs">
                                <span className={cn("flex items-center", isCorrect && "font-semibold text-green-600")}>
                                    {option.text} 
                                    {isCorrect && <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-1"/>}
                                </span>
                                <span className="font-medium">{count}</span>
                            </div>
                            <Progress 
                                value={percentage} 
                                className={cn(
                                    "h-2", 
                                    isCorrect ? "bg-green-500/[0.2]" : "bg-muted",
                                    "data-[state=complete]:bg-green-500 data-[state=complete]:text-green-500"
                                )} 
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}