// src/app/teacher/validations/ValidationConsoleClient.tsx - VERSION CORRIGÉE
'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { validateStudent } from '@/lib/actions/teacher.actions';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { useNamedAbly } from '@/hooks/useNamedAbly';
import { AblyEvents } from '@/lib/ably/events';
import { Loader2, Check, X, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ValidationConsoleClientProps {
  initialStudents: User[];
}

export function ValidationConsoleClient({ initialStudents }: ValidationConsoleClientProps) {
  const [students, setStudents] = useState<User[]>(initialStudents);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { client: ablyClient, isConnected } = useNamedAbly('ValidationConsole');

  const handleNewPendingStudent = useCallback((newStudent: User) => {
    console.log('🔔 [VALIDATION CONSOLE] - Nouvel élève reçu via Ably:', newStudent);
    setStudents(prev => {
      // Éviter les doublons
      if (prev.some(s => s.id === newStudent.id)) {
        return prev;
      }
      return [newStudent, ...prev];
    });
    toast({
      title: "Nouvel élève en attente !",
      description: `${newStudent.name} vient de s'inscrire et attend votre validation.`
    });
  }, [toast]);

  useEffect(() => {
    if (!ablyClient || !isConnected) return;
    
    const channelName = 'classroom-connector:pending-students';
    const channel = ablyClient.channels.get(channelName);
    
    console.log(`[VALIDATION CONSOLE] - Abonnement au canal : ${channelName}`);
    channel.subscribe(AblyEvents.STUDENT_PENDING, (message) => {
        handleNewPendingStudent(message.data);
    });

    return () => {
        console.log(`[VALIDATION CONSOLE] - Désabonnement du canal : ${channelName}`);
        channel.unsubscribe();
    };
  }, [ablyClient, isConnected, handleNewPendingStudent]);


  const handleValidation = (studentId: string, classroomId: string, approve: boolean) => {
    startTransition(async () => {
      try {
        const studentName = students.find(s => s.id === studentId)?.name || 'L\'élève';
        await validateStudent(studentId, classroomId, approve);
        toast({
          title: `Action effectuée !`,
          description: `${studentName} a été ${approve ? 'validé(e)' : 'rejeté(e)'}.`
        });
        setStudents(prev => prev.filter(s => s.id !== studentId));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Impossible de traiter la demande.',
        });
      }
    });
  };

  if (students.length === 0) {
    return (
        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
            <ShieldCheck className="mx-auto h-12 w-12 text-green-500 mb-4"/>
            <h3 className="font-semibold text-lg text-foreground">Tout est à jour !</h3>
            <p>Il n'y a aucun nouvel élève en attente de validation.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {students.map(student => (
        <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
          <div className="mb-4 sm:mb-0">
            <p className="font-semibold text-foreground">{student.name}</p>
            <p className="text-sm text-muted-foreground">{student.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inscrit {formatDistanceToNow(new Date(student.createdAt), { addSuffix: true, locale: fr })}
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Note: La logique d'assignation à une classe n'est pas encore implémentée */}
            <Button onClick={() => handleValidation(student.id, student.classeId || '', true)} disabled={isPending} className="flex-1 bg-green-600 hover:bg-green-700">
              {isPending ? <Loader2 className="animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Approuver
            </Button>
            <Button onClick={() => handleValidation(student.id, student.classeId || '', false)} disabled={isPending} variant="destructive" className="flex-1">
               {isPending ? <Loader2 className="animate-spin" /> : <X className="mr-2 h-4 w-4" />}
               Rejeter
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
