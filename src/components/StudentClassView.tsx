// src/components/StudentClassView.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, Wifi, WifiOff } from "lucide-react";
import type { ClassroomWithStudents } from "@/app/student/class/[id]/page";
import type { User } from "@prisma/client";
import { useAblyPresence } from "@/hooks/useAblyPresence";
import { cn } from "@/lib/utils";

interface StudentClassViewProps {
  classroom: ClassroomWithStudents;
}

export function StudentClassView({ classroom }: StudentClassViewProps) {
    const { onlineMembers } = useAblyPresence(classroom.id, true);

    const onlineStudentIds = onlineMembers.map(m => m.id);

    const sortedStudents = [...classroom.eleves].sort((a: User, b: User) => (b.points ?? 0) - (a.points ?? 0));

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ma Classe : {classroom.nom}</h1>
          <p className="text-muted-foreground">
            Découvrez le classement et les membres de votre classe. Il y a actuellement {onlineStudentIds.length} membre(s) en ligne.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedStudents.map((student: User, index) => {
          const isOnline = onlineStudentIds.includes(student.id);
          return (
            <Card key={student.id} className="transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <CardHeader className="items-center relative">
                <div className="absolute top-4 right-4">
                    {isOnline ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 px-2 py-1 rounded-full">
                            <Wifi className="h-3 w-3" />
                            <span>En ligne</span>
                        </div>
                    ) : (
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <WifiOff className="h-3 w-3" />
                            <span>Hors ligne</span>
                        </div>
                    )}
                </div>
                <div className="relative">
                  <Avatar className={cn("h-20 w-20", isOnline && "ring-2 ring-green-500 ring-offset-2 ring-offset-background")}>
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
          );
        })}
      </div>
    </main>
  );
}
