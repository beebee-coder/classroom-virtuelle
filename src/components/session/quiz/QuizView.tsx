// src/components/session/quiz/QuizView.tsx
'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Users, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import type { Quiz, QuizResponse, QuizResults, User, QuizQuestion, QuizOption } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuizViewProps {
    quiz: Quiz;
    isTeacherView: boolean;
    onSubmitResponse?: (response: QuizResponse) => Promise<{ success: boolean; }>;
    onEndQuiz?: (quizId: string, responses: Map<string, QuizResponse>) => Promise<{ success: boolean; }>;
    responses?: Map<string, QuizResponse>;
    results?: QuizResults | null;
    studentsInSession?: User[];
}

export function QuizView({ quiz, isTeacherView, onSubmitResponse, onEndQuiz, responses = new Map(), results, studentsInSession = [] }: QuizViewProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, startSubmitting] = useTransition();
    const { toast } = useToast();

    // Correction : Gérer le cas où le quiz est absent.
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

    const handleSelectAnswer = (questionId: string, optionId: string) => {
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Submit
            if (onSubmitResponse && Object.keys(selectedAnswers).length === totalQuestions) {
                console.log("📝 [QUIZ VIEW] - Soumission des réponses...");
                startSubmitting(async () => {
                    const result = await onSubmitResponse({ userId: '', userName: '', answers: selectedAnswers });
                    if(result.success) {
                        toast({ title: 'Réponses envoyées !', description: 'Vos réponses ont été enregistrées.' });
                    } else {
                        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer vos réponses.' });
                    }
                });
            } else {
                toast({ variant: 'destructive', title: 'Réponses manquantes', description: 'Veuillez répondre à toutes les questions.' });
            }
        }
    };
    
    if (results) {
        return <QuizResultsView results={results} quiz={quiz} />;
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
                <RadioGroup onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)} value={selectedAnswers[currentQuestion.id]}>
                    {currentQuestion.options.map((option: QuizOption) => (
                        <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-accent">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
            <div className="p-6 border-t">
                <Button className="w-full" onClick={handleNextQuestion} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : (currentQuestionIndex < totalQuestions - 1 ? 'Question suivante' : 'Terminer et voir les résultats')}
                </Button>
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
            <CardContent className="flex-1 overflow-y-auto space-y-4">
                {quiz.questions.map((q: QuizQuestion) => (
                    <QuestionStats key={q.id} question={q} responses={responses} />
                ))}
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
    const optionCounts = question.options.reduce((acc: Record<string, number>, option: QuizOption) => {
        acc[option.id] = 0;
        return acc;
    }, {} as Record<string, number>);

    let totalResponses = 0;
    responses.forEach(response => {
        const answer = response.answers[question.id];
        if (answer && optionCounts.hasOwnProperty(answer)) {
            optionCounts[answer]++;
            totalResponses++;
        }
    });

    return (
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">{question.text}</h4>
            <div className="space-y-2">
                {question.options.map((option: QuizOption) => {
                    const count = optionCounts[option.id];
                    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                    const isCorrect = option.id === question.correctOptionId;
                    return (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className={cn("flex items-center", isCorrect && "font-bold")}>
                                    {option.text} 
                                    {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 ml-2"/>}
                                </span>
                                <span>{count} vote(s)</span>
                            </div>
                            <Progress value={percentage} className={isCorrect ? "bg-green-500" : "bg-primary"} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Final results view
function QuizResultsView({ results, quiz }: { results: QuizResults; quiz: Quiz }) {
    const totalQuestions = quiz.questions.length;
    const scores = Object.values(results.scores);
    const averageScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
    const participationRate = scores.length > 0 ? (Object.keys(results.responses).length / scores.length) * 100 : 0;

    return (
        <Card className="h-full w-full">
            <CardHeader>
                <CardTitle>📊 Résultats du Quiz: {quiz.title}</CardTitle>
                <CardDescription>Voici un résumé des résultats.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                        <CardHeader><CardTitle>Score Moyen</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{averageScore.toFixed(1)} / {totalQuestions}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Participation</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{participationRate.toFixed(0)}%</p></CardContent>
                    </Card>
                </div>
                
                <h3 className="font-semibold mb-2">Détail par Question</h3>
                <div className="space-y-4">
                    {quiz.questions.map((q: QuizQuestion) => {
                        const questionResponses = Object.values(results.responses).map(r => r.answers[q.id]);
                        return <QuestionStats key={q.id} question={q} responses={new Map(Object.entries(results.responses))} />;
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
