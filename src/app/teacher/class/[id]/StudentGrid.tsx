
// src/app/teacher/class/[id]/StudentGrid.tsx
'use client';

import { StudentProfileCard } from './StudentProfileCard';
import type { User } from '@prisma/client';
import type { ClassroomWithDetails } from '@/types';

interface StudentGridProps {
    students: ClassroomWithDetails['eleves'];
    onlineStudentIds: string[];
}

export function StudentGrid({ students, onlineStudentIds }: StudentGridProps) {
    if (!students || students.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">
                    Aucun élève dans cette classe pour le moment.
                </p>
            </div>
        );
    }
    
    const sortedStudents = [...students].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {sortedStudents.map((student, index) => (
                <StudentProfileCard
                    key={student.id}
                    student={student}
                    isOnline={onlineStudentIds.includes(student.id)}
                    isTopStudent={index === 0 && sortedStudents.length > 1}
                />
            ))}
        </div>
    );
}

    