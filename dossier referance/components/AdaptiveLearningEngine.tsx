// components/AdaptiveLearningEngine.tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Target, 
  Clock, 
  Award, 
  Brain,
  Play,
  CheckCircle2
} from 'lucide-react';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  skills: string[];
  completion: number;
  status: 'locked' | 'available' | 'completed' | 'in-progress';
}

export function AdaptiveLearningEngine() {
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([
    {
      id: '1',
      title: 'Maîtrise de la Communication',
      description: 'Développez vos compétences en communication efficace',
      difficulty: 'beginner',
      estimatedTime: 45,
      skills: ['Communication', 'Confiance en soi'],
      completion: 0,
      status: 'available'
    },
    {
      id: '2',
      title: 'Pensée Critique Avancée',
      description: 'Apprenez à analyser et évaluer les informations',
      difficulty: 'intermediate',
      estimatedTime: 60,
      skills: ['Pensée critique', 'Analyse'],
      completion: 0,
      status: 'locked'
    },
    {
      id: '3',
      title: 'Leadership Collaboratif',
      description: 'Devenez un leader qui inspire et mobilise',
      difficulty: 'advanced',
      estimatedTime: 90,
      skills: ['Leadership', 'Collaboration'],
      completion: 0,
      status: 'locked'
    }
  ]);

  const recommendedPath = useMemo(() => {
    return learningPaths.find(path => path.status === 'available');
  }, [learningPaths]);

  const startLearningPath = (pathId: string) => {
    setLearningPaths(paths => paths.map(p => 
      p.id === pathId ? { ...p, status: 'in-progress' as const } : p
    ));
  };

  return (
    <div className="space-y-6">
      {/* Recommandation Personnalisée */}
      {recommendedPath && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Zap className="h-5 w-5" />
              Parcours Recommandé pour Vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{recommendedPath.title}</h3>
                <p className="text-muted-foreground mb-3">{recommendedPath.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {recommendedPath.skills.map(skill => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                  <Badge variant={
                    recommendedPath.difficulty === 'beginner' ? 'default' :
                    recommendedPath.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                  }>
                    {recommendedPath.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recommendedPath.estimatedTime} min
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {recommendedPath.skills.length} compétences
                  </div>
                </div>
              </div>
              <Button onClick={() => startLearningPath(recommendedPath.id)}>
                <Play className="h-4 w-4 mr-2" />
                Commencer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tous les Parcours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Parcours d'Apprentissage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {learningPaths.map(path => (
              <div key={path.id} className={`border rounded-lg p-4 ${
                path.status === 'available' ? 'border-green-200 bg-green-50' :
                path.status === 'locked' ? 'border-gray-200 bg-gray-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2 mb-1">
                      {path.title}
                      {path.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">{path.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {path.skills.map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {path.estimatedTime} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {path.difficulty}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {path.status === 'available' && (
                      <Button size="sm" onClick={() => startLearningPath(path.id)}>
                        <Play className="h-3 w-3 mr-1" />
                        Démarrer
                      </Button>
                    )}
                    {path.status === 'locked' && (
                      <Badge variant="outline" className="text-xs">
                        Verrouillé
                      </Badge>
                    )}
                    {path.status === 'in-progress' && (
                      <>
                        <Progress value={path.completion} className="w-24 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {path.completion}% complété
                        </span>
                      </>
                    )}
                    {path.status === 'completed' && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Terminé
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
