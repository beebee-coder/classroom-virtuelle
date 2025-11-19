// src/components/session/quiz/QuizView.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Users, CheckCircle, XCircle } from 'lucide-react';
import type { Quiz, QuizResponse, QuizResults, User, QuizQuestion, QuizOption } from '@/types';

interface QuizViewProps {
    quiz: Quiz;
    isTeacherView: boolean;
    onSubmitResponse?: (response: QuizResponse) => void;
    onEndQuiz?: (quizId: string) => void;
    responses?: Map<string, QuizResponse>;
    results?: QuizResults | null;
    studentsInSession?: User[];
}

export function QuizView({ quiz, isTeacherView, onSubmitResponse, onEndQuiz, responses, results, studentsInSession = [] }: QuizViewProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

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
            if (onSubmitResponse) {
                onSubmitResponse({ userId: '', userName: '', answers: selectedAnswers });
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
                <Progress value={(currentQuestionIndex / totalQuestions) * 100} className="mb-2" />
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>Question {currentQuestionIndex + 1} sur {totalQuestions}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <h3 className="font-semibold mb-4 text-lg">{currentQuestion.text}</h3>
                <RadioGroup onValueChange={(value) => handleSelectAnswer(currentQuestion.id, value)} value={selectedAnswers[currentQuestion.id]}>
                    {currentQuestion.options.map(option => (
                        <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-md has-[:checked]:bg-accent">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">{option.text}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
            <div className="p-6 border-t">
                <Button className="w-full" onClick={handleNextQuestion}>
                    {currentQuestionIndex < totalQuestions - 1 ? 'Question suivante' : 'Terminer et voir les résultats'}
                </Button>
            </div>
        </Card>
    );
}

// Teacher's live dashboard view
function TeacherQuizDashboard({ quiz, responses = new Map(), onEndQuiz, studentsInSession = [] }: {
    quiz: Quiz;
    responses?: Map<string, QuizResponse>;
    onEndQuiz?: (quizId: string) => void;
    studentsInSession?: User[];
}) {
    const totalStudents = studentsInSession.length;
    const answeredStudents = responses.size;

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
                    <Progress value={(answeredStudents / totalStudents) * 100} className="w-1/3" />
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
                {quiz.questions.map(q => (
                    <QuestionStats key={q.id} question={q} responses={responses} />
                ))}
            </CardContent>
            <div className="p-6 border-t">
                {onEndQuiz && <Button variant="destructive" className="w-full" onClick={() => onEndQuiz(quiz.id)}>Terminer le Quiz pour tout le monde</Button>}
            </div>
        </Card>
    );
}

function QuestionStats({ question, responses }: { question: QuizQuestion; responses: Map<string, QuizResponse> }) {
    const optionCounts = question.options.reduce((acc, option) => {
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
                {question.options.map(option => {
                    const count = optionCounts[option.id];
                    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                    const isCorrect = option.id === question.correctOptionId;
                    return (
                        <div key={option.id}>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="flex items-center">{option.text} {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 ml-2"/>}</span>
                                <span>{count} vote(s)</span>
                            </div>
                            <Progress value={percentage} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Final results view
function QuizResultsView({ results, quiz }: { results: QuizResults; quiz: Quiz }) {
    // This is a placeholder. A real implementation would have more detailed stats.
    return (
        <Card className="h-full w-full">
            <CardHeader>
                <CardTitle>Résultats du Quiz: {quiz.title}</CardTitle>
                <CardDescription>Voici un résumé des résultats.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>La vue des résultats n'est pas encore implémentée.</p>
                <pre className="mt-4 p-4 bg-muted rounded-md text-xs overflow-auto">
                    {JSON.stringify(results, null, 2)}
                </pre>
            </CardContent>
        </Card>
    );
}
