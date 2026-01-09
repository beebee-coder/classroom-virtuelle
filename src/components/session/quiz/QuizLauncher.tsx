// src/components/session/quiz/QuizLauncher.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, Rocket, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { CreateQuizData } from '@/lib/actions/ably-session.actions';

interface QuizLauncherProps {
    onStartQuiz: (quiz: CreateQuizData) => Promise<{ success: boolean; error?: string }>;
}

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    options: Option[];
    correctOptionId: string;
}

export function QuizLauncher({ onStartQuiz }: QuizLauncherProps) {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const addQuestion = () => {
        setQuestions(prev => [...prev, { id: uuidv4(), text: '', options: [{ id: uuidv4(), text: '' }], correctOptionId: '' }]);
    };

    const removeQuestion = (questionId: string) => {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const updateQuestionText = (questionId: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, text } : q));
    };

    const addOption = (questionId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId && q.options.length < 4) {
                return { ...q, options: [...q.options, { id: uuidv4(), text: '' }] };
            }
            return q;
        }));
    };

    const removeOption = (questionId: string, optionId: string) => {
        setQuestions(prev => prev.map(q => {
            if (q.id === questionId) {
                const newOptions = q.options.filter(o => o.id !== optionId);
                // Si l'option supprimée était la bonne réponse, réinitialiser
                if (q.correctOptionId === optionId) {
                    return { ...q, options: newOptions, correctOptionId: '' };
                }
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const updateOptionText = (questionId: string, optionId: string, text: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? {
            ...q,
            options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
        } : q));
    };

    const setCorrectOption = (questionId: string, optionId: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, correctOptionId: optionId } : q));
    };

    const handleStartQuiz = () => {
        console.log("🚀 [QUIZ LAUNCHER] - Tentative de lancement du quiz...");
        // Validation
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'Titre manquant', description: 'Veuillez donner un titre à votre quiz.' });
            return;
        }
        if (questions.length === 0) {
            toast({ variant: 'destructive', title: 'Aucune question', description: 'Veuillez ajouter au moins une question.' });
            return;
        }
        for (const q of questions) {
            if (!q.text.trim()) {
                toast({ variant: 'destructive', title: 'Question vide', description: 'Toutes les questions doivent avoir un texte.' });
                return;
            }
            if (q.options.some(o => !o.text.trim())) {
                toast({ variant: 'destructive', title: 'Option vide', description: 'Toutes les options doivent avoir un texte.' });
                return;
            }
            if (!q.correctOptionId) {
                toast({ variant: 'destructive', title: 'Réponse manquante', description: `Veuillez sélectionner la bonne réponse pour la question : "${q.text}"` });
                return;
            }
        }

        startTransition(async () => {
            const quizData: CreateQuizData = { title, questions };
            const result = await onStartQuiz(quizData);
            if (!result.success) {
                toast({ variant: 'destructive', title: 'Erreur', description: result.error || 'Impossible de lancer le quiz.' });
            } else {
                 toast({ title: 'Quiz lancé !', description: 'Les élèves peuvent maintenant répondre.' });
            }
        });
    };

    return (
        <Card className="h-full w-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Rocket /> Lancer un Nouveau Quiz</CardTitle>
                <CardDescription>Créez les questions et lancez le quiz pour évaluer la classe en temps réel.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6 overflow-y-auto p-6">
                <div className="space-y-2">
                    <Label htmlFor="quiz-title">Titre du Quiz</Label>
                    <Input id="quiz-title" placeholder="Ex: Compréhension du chapitre 3" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                {questions.map((q, qIndex) => (
                    <Card key={q.id} className="p-4 bg-muted/50">
                        <div className="flex justify-between items-center mb-2">
                            <Label>Question {qIndex + 1}</Label>
                            <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        <Input 
                            placeholder="Texte de la question..." 
                            value={q.text} 
                            onChange={e => updateQuestionText(q.id, e.target.value)}
                            className="mb-3"
                        />
                        <div className="space-y-2">
                            {q.options.map(o => (
                                <div key={o.id} className="flex items-center gap-2">
                                    <Input 
                                        placeholder="Texte de l'option..."
                                        value={o.text}
                                        onChange={e => updateOptionText(q.id, o.id, e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button 
                                        variant={q.correctOptionId === o.id ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setCorrectOption(q.id, o.id)}
                                    >
                                        Bonne réponse
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => removeOption(q.id, o.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => addOption(q.id)} disabled={q.options.length >= 4}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Ajouter une option
                            </Button>
                        </div>
                    </Card>
                ))}

                <Button variant="secondary" onClick={addQuestion}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Ajouter une question
                </Button>
            </CardContent>
            <div className="p-6 border-t">
                <Button className="w-full" onClick={handleStartQuiz} disabled={isPending}>
                    {isPending ? <Loader2 className="animate-spin mr-2"/> : <Rocket className="mr-2" />}
                    Lancer le Quiz
                </Button>
            </div>
        </Card>
    );
}
