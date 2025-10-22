// src/components/TaskEditor.tsx
"use client";

import { useState } from "react";
import { Task } from "@prisma/client";
import { Button } from "./ui/button";
import { PlusCircle, Award } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { TaskForm } from "./TaskForm";

interface TaskEditorProps {
  initialTasks: Task[];
}

export function TaskEditor({ initialTasks }: TaskEditorProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleFormSuccess = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    setIsFormOpen(false);
    setSelectedTask(null);
  };
  
  const openCreateForm = () => {
    setSelectedTask(null);
    setIsFormOpen(true);
  }

  const openEditForm = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  }
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case 'EASY': return 'bg-green-100 text-green-800 border-green-200';
        case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'HARD': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreateForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une tâche
        </Button>
      </div>
      
      <TaskForm 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen}
        onSuccess={handleFormSuccess}
        task={selectedTask}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tasks.map((task) => (
          <Card 
            key={task.id} 
            className="cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col" 
            onClick={() => openEditForm(task)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{task.title}</CardTitle>
              <CardDescription className="text-xs pt-1">{task.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
               <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{task.type}</Badge>
                    <Badge variant="outline">{task.category}</Badge>
                    <Badge className={getDifficultyColor(task.difficulty)}>{task.difficulty}</Badge>
               </div>
            </CardContent>
            <CardFooter>
                 <div className="flex items-center gap-1 font-bold text-amber-600">
                    <Award className="h-4 w-4" />
                    <span>{task.points} Points</span>
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
