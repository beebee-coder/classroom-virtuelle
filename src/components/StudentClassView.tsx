// src/components/StudentClassView.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star } from "lucide-react";
import type { ClassroomWithStudents } from "@/app/student/class/[id]/page";
import type { User } from "@prisma/client";

interface StudentClassViewProps {
  classroom: ClassroomWithStudents;
}

export function StudentClassView({ classroom }: StudentClassViewProps) {
    const sortedStudents = [...classroom.eleves].sort((a: User, b: User) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ma Classe : {classroom.nom}</h1>
          <p className="text-muted-foreground">
            Découvrez le classement et les membres de votre classe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedStudents.map((student: User, index) => (
          <Card key={student.id} className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="items-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={student.image ?? `https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.id}`} alt={student.name ?? 'Avatar'} />
                  <AvatarFallback>{student.name?.charAt(0) ?? 'E'}</AvatarFallback>
                </Avatar>
                {index === 0 && (
                   <Crown className="absolute -top-3 -right-3 h-8 w-8 text-yellow-400 transform rotate-12" strokeWidth={1.5} />
                )}
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <CardTitle className="text-lg">{student.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 mt-2 text-base">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>{student.points?.toLocaleString() ?? 0} pts</span>
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
