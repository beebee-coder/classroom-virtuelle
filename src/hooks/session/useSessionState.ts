// src/hooks/session/useSessionState.ts
'use client';

import { useState, useCallback } from 'react';
import type { DocumentInHistory, WhiteboardOperation, QuizWithQuestions, QuizResponse, QuizResults } from '@/types'; // CORRECTION: Utiliser QuizWithQuestions
import { closeQuiz } from '@/lib/actions/ably-session.actions'; // Importer l'action

interface UseSessionStateProps {
    initialDocumentHistory?: DocumentInHistory[];
    initialActiveQuiz?: QuizWithQuestions | null; // CORRECTION: Utiliser QuizWithQuestions
    sessionId: string; // Ajouter sessionId aux props
}

export function useSessionState({
    initialDocumentHistory = [],
    initialActiveQuiz = null,
    sessionId, // Utiliser sessionId
}: UseSessionStateProps) {
    const [activeTool, setActiveTool] = useState('camera');
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentHistory, setDocumentHistory] = useState<DocumentInHistory[]>(initialDocumentHistory);
    const [whiteboardOperations, setWhiteboardOperations] = useState<WhiteboardOperation[]>([]);
    
    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState<QuizWithQuestions | null>(initialActiveQuiz); // CORRECTION: Utiliser QuizWithQuestions
    const [quizResponses, setQuizResponses] = useState<Map<string, QuizResponse>>(new Map());
    const [quizResults, setQuizResults] = useState<QuizResults | null>(null);

    const handleToolChange = useCallback((tool: string) => {
        setActiveTool(tool);
    }, []);

    const handleSelectDocument = useCallback((doc: DocumentInHistory) => {
        setDocumentUrl(doc.url);
        setActiveTool('document');
    }, []);

    const handleUploadSuccess = useCallback((doc: DocumentInHistory) => {
        setDocumentHistory(prev => [doc, ...prev]);
        setDocumentUrl(doc.url);
        setActiveTool('document');
    }, []);

    const handleStartQuiz = useCallback((quiz: QuizWithQuestions) => { // CORRECTION: Utiliser QuizWithQuestions
        setActiveQuiz(quiz);
        setQuizResponses(new Map());
        setQuizResults(null);
        setActiveTool('quiz');
    }, []);

    const handleEndQuiz = useCallback((results: QuizResults) => {
        setQuizResults(results);
    }, []);
    
    const handleNewQuizResponse = useCallback((response: QuizResponse) => {
        setQuizResponses(prev => new Map(prev).set(response.userId, response));
    }, []);

    const handleCloseQuizResults = useCallback(async () => {
        // Appeler l'action serveur pour notifier les autres clients
        await closeQuiz(sessionId);
        
        // Réinitialiser l'état local du professeur
        setActiveQuiz(null);
        setQuizResponses(new Map());
        setQuizResults(null);
        console.log("🔄 [SESSION STATE] - Espace de travail du quiz réinitialisé.");
    }, [sessionId]);

    const handleQuizClosed = useCallback(() => {
        // Cette fonction est appelée par le listener Ably pour l'élève
        setActiveQuiz(null);
        setQuizResponses(new Map());
        setQuizResults(null);
        setActiveTool('camera'); // Revenir à la vue par défaut pour l'élève
        console.log("🔄 [SESSION STATE] - Vue Quiz réinitialisée pour l'élève.");
    }, []);

    return {
        activeTool,
        documentUrl,
        documentHistory,
        whiteboardOperations,
        activeQuiz,
        quizResponses,
        quizResults,
        setActiveTool: handleToolChange,
        setDocumentUrl,
        setDocumentHistory,
        setWhiteboardOperations,
        handleSelectDocument,
        handleUploadSuccess,
        handleStartQuiz,
        handleEndQuiz,
        handleNewQuizResponse,
        handleCloseQuizResults,
        handleQuizClosed, // Exporter la nouvelle fonction de reset pour les élèves
    };
}