"use client";

import { AlertCircle } from 'lucide-react';

// Composant d'erreur pour le dashboard élève
export function StudentDashboardError({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8 max-w-md">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-destructive mb-2">Erreur de chargement</h1>
                <p className="text-muted-foreground mb-4">{message}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    Réessayer
                </button>
            </div>
        </div>
    );
}
