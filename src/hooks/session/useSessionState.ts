// src/hooks/session/useSessionState.ts
'use client';

import { useState, useCallback } from 'react';
import type { DocumentInHistory, WhiteboardOperation, Quiz, QuizResponse, QuizResults } from '@/types';

interface UseSessionStateProps {
    initialDocumentHistory?: DocumentInHistory[];
    initialActiveQuiz?: Quiz | null;
}

export function useSessionState({
    initialDocumentHistory = [],
    initialActiveQuiz = null,
}: UseSessionStateProps) {
    const [activeTool, setActiveTool] = useState('camera');
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    const [documentHistory, setDocumentHistory] = useState<DocumentInHistory[]>(initialDocumentHistory);
    const [whiteboardOperations, setWhiteboardOperations] = useState<WhiteboardOperation[]>([]);
    
    // Quiz State
    const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(initialActiveQuiz);
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

    const handleStartQuiz = useCallback((quiz: Quiz) => {
        setActiveQuiz(quiz);
        setQuizResponses(new Map());
        setQuizResults(null);
        setActiveTool('quiz');
    }, []);

    const handleEndQuiz = useCallback((results: QuizResults) => {
        setQuizResults(results);
        // On ne change pas d'outil pour que le prof puisse voir les résultats.
        // setActiveQuiz(null); // Le prof peut lancer un autre quiz plus tard
    }, []);
    
    const handleNewQuizResponse = useCallback((response: QuizResponse) => {
        setQuizResponses(prev => new Map(prev).set(response.userId, response));
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
    };
}
