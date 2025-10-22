// components/SkillMatrix.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { Target, TrendingUp, Brain, Zap } from 'lucide-react';
import prisma from '@/lib/prisma';
import { TaskCategory } from '@prisma/client';

interface SkillMatrixProps {
  studentId: string;
  classId: string | null | undefined;
}

export async function SkillMatrix({ studentId, classId }: SkillMatrixProps) {
  if (!classId) return null;

  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      studentId: studentId,
      task: {
        category: {
          not: 'PERSONAL'
        }
      }
    },
    include: {
      task: true,
    }
  });

  const classTasks = await prisma.task.findMany({
    where: {
      isActive: true,
      category: {
        not: 'PERSONAL'
      }
    }
  });

  const skillData = Object.values(TaskCategory).filter(c => c !== 'PERSONAL').map(category => {
    const categoryTasks = classTasks.filter(t => t.category === category);
    const completedTasksInCategory = studentProgress.filter(p => p.task.category === category && (p.status === 'COMPLETED' || p.status === 'VERIFIED'));

    const totalPointsPossible = categoryTasks.reduce((sum, task) => sum + task.points, 0);
    const pointsEarned = completedTasksInCategory.reduce((sum, p) => sum + (p.pointsAwarded ?? 0), 0);
    
    const currentLevel = totalPointsPossible > 0 ? Math.round((pointsEarned / totalPointsPossible) * 100) : 0;
    const progress = completedTasksInCategory.length > 0 ? (completedTasksInCategory.length / categoryTasks.length) * 100 : 0;

    return {
      skill: category,
      currentLevel: currentLevel,
      targetLevel: 80, // Target could be dynamic
      progress: progress,
      sessions: completedTasksInCategory.length,
      lastActivity: completedTasksInCategory[0]?.completionDate ?? new Date(0),
    };
  });

  const radarData = skillData.map(skill => ({
    subject: skill.skill,
    A: skill.currentLevel,
    B: skill.targetLevel,
    fullMark: 100,
  }));

  const recommendations = skillData.filter(s => s.currentLevel < 50).map(skill => ({
      skill: skill.skill,
      action: `Se concentrer sur les tâches de type '${skill.skill}'`,
      priority: skill.currentLevel < 25 ? 'high' as const : 'medium' as const,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Radar Chart des Compétences */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Profil des Compétences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Niveau Actuel" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Radar name="Objectif" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations Intelligentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.length > 0 ? recommendations.map((rec, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              rec.priority === 'high' 
                ? 'border-l-red-500 bg-red-50' 
                : 'border-l-yellow-500 bg-yellow-50'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold text-sm">{rec.skill}</span>
                <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                  {rec.priority === 'high' ? 'Prioritaire' : 'Recommandé'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{rec.action}</p>
              <Button variant="outline" size="sm" className="w-full mt-2">
                <Zap className="h-3 w-3 mr-1" />
                Voir Tâches
              </Button>
            </div>
          )) : <p className="text-sm text-muted-foreground text-center">Aucune recommandation pour le moment. Excellent travail !</p>}
        </CardContent>
      </Card>

      {/* Progression Détaillée */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Détail des Progrès
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {skillData.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{skill.skill}</span>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{skill.sessions} tâches</Badge>
                    <span className="text-sm font-bold text-blue-600">
                      Niveau {skill.currentLevel}/100
                    </span>
                  </div>
                </div>
                <Progress value={skill.progress} className="h-2" />
                 <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Objectif: {skill.targetLevel}/100</span>
                   {skill.lastActivity > new Date(0) && <span>Dernière activité: {skill.lastActivity.toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
