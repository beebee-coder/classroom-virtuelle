// src/components/session/quiz/QuizView.tsx
'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Users, CheckCircle, XCircle, Loader2, Info, Trophy } from 'lucide-react';
import type { Quiz, QuizResponse, QuizResults, User, QuizQuestion, QuizOption } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { QuizResultsView } from './QuizResultsView';
import { ScrollArea } from '@/components/ui/scroll-area';

interface QuizViewProps {
    quiz: Quiz | null;
    isTeacherView: boolean;
    onSubmitResponse?: (response: QuizResponse) => Promise<{ success: boolean; }>;
    onEndQuiz?: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    onCloseResults?: () => void;
    responses?: Map<string, QuizResponse>;
    results?: QuizResults | null;
    studentsInSession?: User[];
}

export function QuizView({ quiz, isTeacherView, onSubmitResponse, onEndQuiz, onCloseResults, responses = new Map(), results, studentsInSession = [] }: QuizViewProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, boolean>>({});
    const [isSubmitting, startSubmitting] = useTransition();
    const { toast } = useToast();

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return (
            <Card className="h-full w-full flex flex-col items-center justify-center">
                <CardHeader className="text-center">
                    <Info className="h-10 w-10 mx-auto text-muted-foreground" />
                    <CardTitle>Quiz non disponible</CardTitle>
                    <CardDescription>Aucun quiz n'est actuellement actif ou il est mal configuré.</CardDescription>
                </CardHeader>
            </Card>
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
                    userId: '', // L'ID utilisateur sera ajouté côté serveur
                    userName: '',
                    answers: { [currentQuestion.id]: selectedOptionId }
                };
                const result = await onSubmitResponse(responsePayload);
                if (result.success) {
                    setSubmittedAnswers(prev => ({ ...prev, [currentQuestion.id]: true }));
                    toast({ title: 'Réponse enregistrée !' });
                } else {
                    toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'enregistrer la réponse." });
                }
            }
        });
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    if (results && onCloseResults) {
        return <QuizResultsView results={results} quiz={quiz} onClose={onCloseResults} students={studentsInSession} isTeacherView={isTeacherView} />;
    }

    if (isTeacherView) {
        return <TeacherQuizDashboard quiz={quiz} responses={responses} onEndQuiz={onEndQuiz} studentsInSession={studentsInSession} />;
    }

    // Student View
    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader>
                <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} className="mb-2" />
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} sur {totalQuestions}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <h3 className="font-semibold mb-4 text-lg">{currentQuestion.text}</h3>
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
                            <div key={option.id} className={cn("flex items-center space-x-3 p-3 border rounded-md transition-colors", stateStyle, !isQuestionSubmitted && "has-[:checked]:bg-accent")}>
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                                {isQuestionSubmitted && (
                                    isCorrect ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                                    isSelected ? <XCircle className="h-5 w-5 text-red-500" /> : null
                                )}
                            </div>
                        );
                    })}
                </RadioGroup>
            </CardContent>
            <div className="p-6 border-t flex justify-end">
                {!isQuestionSubmitted ? (
                    <Button onClick={handleSubmitQuestion} disabled={isSubmitting || !selectedAnswers[currentQuestion.id]}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Valider ma réponse'}
                    </Button>
                ) : (
                    currentQuestionIndex < totalQuestions - 1 ? (
                        <Button onClick={handleNextQuestion}>
                            Question suivante
                        </Button>
                    ) : (
                         <p className="text-muted-foreground font-semibold">Quiz terminé ! En attente des résultats...</p>
                    )
                )}
            </div>
        </Card>
    );
}

// Teacher's live dashboard view
function TeacherQuizDashboard({ quiz, responses = new Map(), onEndQuiz, studentsInSession = [] }: {
    quiz: Quiz;
    responses?: Map<string, QuizResponse>;
    onEndQuiz?: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    studentsInSession?: User[];
}) {
    const totalStudents = studentsInSession.length;
    const answeredStudents = responses.size;
    const [isEnding, startEnding] = useTransition();

    const studentScores = useMemo(() => {
        const scores: Record<string, { name: string; score: number }> = {};
        studentsInSession.forEach(student => {
            scores[student.id] = { name: student.name || 'Élève', score: 0 };
        });

        responses.forEach((response, userId) => {
            let userScore = 0;
            quiz.questions.forEach(q => {
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
        console.log("🏁 [TEACHER DASHBOARD] - Fin du quiz déclenchée.");
        startEnding(async () => {
            await onEndQuiz(quiz.id, responses);
        });
    };

    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader>
                <CardTitle>{quiz.title} - En Direct</CardTitle>
                <CardDescription>Suivez les réponses de vos élèves en temps réel.</CardDescription>
                <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{answeredStudents} / {totalStudents} ont répondu</span>
                    </div>
                    <Progress value={(totalStudents > 0 ? (answeredStudents / totalStudents) * 100 : 0)} className="w-1/3" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 grid md:grid-cols-2 gap-6 min-h-0">
                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold">Réponses par Question</h3>
                    <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-4">
                            {quiz.questions.map((q: QuizQuestion) => (
                                <QuestionStats key={q.id} question={q} responses={responses} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <div className="flex flex-col gap-4">
                     <h3 className="font-semibold">Scores en Direct</h3>
                     <ScrollArea className="flex-1 pr-4 -mr-4">
                        <div className="space-y-2">
                            {studentScores.map(([userId, data]) => (
                                <div key={userId} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <span className="text-sm font-medium">{data.name}</span>
                                    <span className="font-semibold flex items-center gap-1">
                                        <Trophy className="h-4 w-4 text-yellow-500" /> 
                                        {data.score} / {quiz.questions.length}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
            <div className="p-6 border-t">
                <Button variant="destructive" className="w-full" onClick={handleEndQuiz} disabled={isEnding}>
                    {isEnding ? <Loader2 className="animate-spin" /> : "Terminer le Quiz pour tout le monde"}
                </Button>
            </div>
        </Card>
    );
}

function QuestionStats({ question, responses }: { question: QuizQuestion; responses: Map<string, QuizResponse> }) {
    const optionCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        question.options.forEach(o => counts[o.id] = 0);
        
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
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">{question.text}</h4>
            <div className="space-y-2">
                {question.options.map((option: QuizOption) => {
                    const count = optionCounts.counts[option.id] || 0;
                    const percentage = optionCounts.totalResponses > 0 ? (count / optionCounts.totalResponses) * 100 : 0;
                    const isCorrect = option.id === question.correctOptionId;
                    return (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className={cn("flex items-center", isCorrect && "font-bold")}>
                                    {option.text} 
                                    {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 ml-2"/>}
                                </span>
                                <span>{count}</span>
                            </div>
                            <Progress value={percentage} className={cn(isCorrect && "bg-green-500")} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
