// src/app/teacher/validations/ValidationConsoleClient.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateStudent } from '@/lib/actions/teacher.actions';
import type { User, Classroom } from '@prisma/client';
import { useNamedAbly } from '@/hooks/useNamedAbly';
import { getPendingStudentsChannelName } from '@/lib/ably/channels';
import { AblyEvents } from '@/lib/ably/events';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ValidationConsoleClientProps {
  initialPendingStudents: User[];
  teacherClasses: Pick<Classroom, 'id' | 'nom'>[];
}

export function ValidationConsoleClient({ initialPendingStudents, teacherClasses }: ValidationConsoleClientProps) {
  const [pendingStudents, setPendingStudents] = useState(initialPendingStudents);
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const ablyClient = useNamedAbly('ValidationConsoleClient');

  useEffect(() => {
    if (!ablyClient) return;

    const channelName = getPendingStudentsChannelName();
    const channel = ablyClient.client.channels.get(channelName);

    const listener = (message: any) => {
      console.log("📨 [CONSOLE VALIDATION] - Événement 'student-pending' reçu!", message.data);
      const newStudent: User = {
        id: message.data.studentId,
        name: message.data.studentName,
        email: message.data.studentEmail,
        emailVerified: null,
        image: null,
        password: null,
        parentPassword: null,
        role: 'ELEVE',
        validationStatus: 'PENDING',
        points: 0,
        ambition: null,
        classeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setPendingStudents(prev => {
        if (prev.some(s => s.id === newStudent.id)) return prev;
        toast({
            title: "🔔 Nouvel élève en attente !",
            description: `${newStudent.name} vient de s'inscrire et attend votre validation.`
        });
        return [...prev, newStudent];
      });
    };

    channel.subscribe(AblyEvents.STUDENT_PENDING, listener);

    return () => {
      channel.unsubscribe(AblyEvents.STUDENT_PENDING, listener);
    };
  }, [ablyClient, toast]);


  const handleValidate = (student: User) => {
    const classroomId = selectedClasses[student.id];
    if (!classroomId) {
        toast({ variant: 'destructive', title: 'Classe requise', description: 'Veuillez sélectionner une classe pour cet élève.' });
        return;
    }
    
    startTransition(async () => {
      try {
        const validated = await validateStudent(student.id, classroomId);
        toast({ title: 'Élève validé !', description: `${validated.name} a été ajouté à la classe.` });
        setPendingStudents(prev => prev.filter(s => s.id !== student.id));
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur de validation', description: 'Impossible de valider cet élève.' });
      }
    });
  };

  const handleClassSelection = (studentId: string, classroomId: string) => {
    setSelectedClasses(prev => ({...prev, [studentId]: classroomId}));
  }

  if (pendingStudents.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Aucun nouvel élève en attente de validation. Bravo !</p>;
  }

  return (
    <div className="space-y-4">
      {pendingStudents.map(student => (
        <div key={student.id} className="flex flex-col sm:flex-row items-center justify-between p-3 border rounded-lg bg-card gap-4">
          <div>
            <p className="font-medium">{student.name}</p>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={(value) => handleClassSelection(student.id, value)} disabled={isPending}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Choisir une classe..." />
                </SelectTrigger>
                <SelectContent>
                    {teacherClasses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button onClick={() => handleValidate(student)} disabled={isPending || !selectedClasses[student.id]}>
                {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4"/>}
                Valider et Assigner
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
