// src/app/teacher/validations/StudentValidationConsole.tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { validateStudentRegistration } from '@/lib/actions/teacher.actions';
import { Loader2, UserCheck, UserX } from 'lucide-react';
import type { Classroom } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PendingStudent {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: Date;
}

interface StudentValidationConsoleProps {
  initialStudents: PendingStudent[];
  classrooms: Pick<Classroom, 'id' | 'nom'>[];
}

export function StudentValidationConsole({ initialStudents, classrooms }: StudentValidationConsoleProps) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleClassChange = (studentId: string, classId: string) => {
    setSelectedClasses(prev => ({ ...prev, [studentId]: classId }));
  };

  const handleValidate = (studentId: string) => {
    const classId = selectedClasses[studentId];
    if (!classId) {
      toast({
        variant: 'destructive',
        title: 'Classe requise',
        description: 'Veuillez sélectionner une classe pour cet élève.',
      });
      return;
    }

    startTransition(async () => {
      try {
        await validateStudentRegistration(studentId, classId);
        toast({
          title: 'Élève validé !',
          description: `L'élève a été ajouté à la classe sélectionnée.`,
        });
        setStudents(prev => prev.filter(s => s.id !== studentId));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur de validation',
          description: error instanceof Error ? error.message : 'Une erreur inconnue est survenue.',
        });
      }
    });
  };

  if (students.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <UserCheck className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-lg font-medium">Aucune inscription en attente</h3>
        <p className="mt-1 text-sm">Tous les élèves ont été validés. Excellent travail !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Inscrit</TableHead>
                <TableHead className="w-[200px]">Assigner à la classe</TableHead>
                <TableHead className="text-right w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.email}</div>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(student.createdAt), { addSuffix: true, locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedClasses[student.id]}
                      onValueChange={(value) => handleClassChange(student.id, value)}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleValidate(student.id)}
                      disabled={!selectedClasses[student.id] || isPending}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Valider'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
