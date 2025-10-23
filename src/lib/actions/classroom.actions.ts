// src/lib/actions/classroom.actions.ts - NOUVEAU FICHIER
'use server';

import { ClassroomWithDetails, User } from '@/lib/types';

// Données factices pour la démonstration
const MOCK_CLASSROOM_DATA: ClassroomWithDetails = {
    id: 'classe-a',
    nom: 'Classe de Démo',
    eleves: [
        {
            id: 'eleve-1',
            name: 'Alice Martin',
            email: 'alice@demo.com',
            points: 150,
            image: null,
            role: 'ELEVE',
            classeId: 'classe-a'
        },
        {
            id: 'eleve-2', 
            name: 'Bruno Leroy',
            email: 'bruno@demo.com',
            points: 120,
            image: null,
            role: 'ELEVE',
            classeId: 'classe-a'
        },
        {
            id: 'eleve-3',
            name: 'Clara Dubois',
            email: 'clara@demo.com', 
            points: 180,
            image: null,
            role: 'ELEVE',
            classeId: 'classe-a'
        },
        {
            id: 'eleve-4',
            name: 'David Moreau',
            email: 'david@demo.com',
            points: 90,
            image: null, 
            role: 'ELEVE',
            classeId: 'classe-a'
        }
    ]
};

export async function getClassroomWithStudents(classroomId: string): Promise<ClassroomWithDetails> {
    try {
        console.log(`🏫 [CLASSROOM ACTION] - Récupération de la classe ${classroomId}`);
        
        // Simulation d'un délai de chargement
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Retourner les données factices
        return MOCK_CLASSROOM_DATA;
        
    } catch (error) {
        console.error('❌ [CLASSROOM ACTION] - Erreur:', error);
        throw new Error('Impossible de récupérer les données de la classe');
    }
}