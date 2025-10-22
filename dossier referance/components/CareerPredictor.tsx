// components/CareerPredictor.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  Star,
  Briefcase,
  Zap,
  Map
} from 'lucide-react';

interface CareerPrediction {
  role: string;
  match: number;
  growth: number;
  salary: string;
  skills: { skill: string; level: number; required: number }[];
  timeline: { year: number; milestone: string }[];
}

export function CareerPredictor() {
  const [predictions, setPredictions] = useState<CareerPrediction[]>([
    {
      role: 'AI Engineer',
      match: 92,
      growth: 45,
      salary: '$120K-$180K',
      skills: [
        { skill: 'Machine Learning', level: 85, required: 80 },
        { skill: 'Python', level: 90, required: 85 },
        { skill: 'Data Analysis', level: 78, required: 75 },
        { skill: 'Problem Solving', level: 88, required: 85 }
      ],
      timeline: [
        { year: 1, milestone: 'Junior AI Developer' },
        { year: 3, milestone: 'AI Specialist' },
        { year: 5, milestone: 'Lead AI Engineer' }
      ]
    },
    {
      role: 'Data Scientist',
      match: 87,
      growth: 35,
      salary: '$100K-$160K',
      skills: [
        { skill: 'Statistics', level: 82, required: 80 },
        { skill: 'Data Visualization', level: 75, required: 70 },
        { skill: 'SQL', level: 80, required: 75 },
        { skill: 'Business Insight', level: 85, required: 80 }
      ],
      timeline: [
        { year: 1, milestone: 'Data Analyst' },
        { year: 2, milestone: 'Data Scientist' },
        { year: 4, milestone: 'Senior Data Scientist' }
      ]
    }
  ]);

  const generateLearningPath = (career: CareerPrediction) => {
    // Génération de parcours personnalisé basé sur les écarts de compétences
    const gaps = career.skills.filter(skill => skill.level < skill.required);
    return gaps.map(gap => ({
      skill: gap.skill,
      gap: gap.required - gap.level,
      resources: [
        `Cours avancé en ${gap.skill}`,
        `Projet pratique: ${gap.skill} Application`,
        `Mentorat spécialisé ${gap.skill}`
      ]
    }));
  };

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-blue-50 border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-teal-700">
          <Target className="h-5 w-5" />
          Intelligence de Carrière - Prédictions IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {predictions.map((prediction, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white">
            {/* En-tête de Carrière */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {prediction.role}
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {prediction.match}% Match
                  </Badge>
                </h3>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Croissance: +{prediction.growth}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    {prediction.salary}
                  </div>
                </div>
              </div>
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            </div>

            {/* Compétences Requises */}
            <div className="mb-4">
              <h4 className="font-semibold mb-3">Compétences Clés</h4>
              <div className="space-y-3">
                {prediction.skills.map((skill, skillIndex) => (
                  <div key={skillIndex}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{skill.skill}</span>
                      <span>
                        {skill.level}/{skill.required} 
                        {skill.level >= skill.required ? ' ✅' : ' ⚠️'}
                      </span>
                    </div>
                    <Progress 
                      value={(skill.level / skill.required) * 100}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Parcours d'Apprentissage */}
            <div className="mb-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Map className="h-4 w-4 text-blue-600" />
                Roadmap de Développement
              </h4>
              <div className="space-y-2">
                {generateLearningPath(prediction).map((path, pathIndex) => (
                  <div key={pathIndex} className="bg-blue-50 rounded p-3">
                    <div className="font-medium text-blue-800 mb-2">
                      {path.skill} (+{path.gap} points requis)
                    </div>
                    <div className="space-y-1">
                      {path.resources.map((resource, resIndex) => (
                        <div key={resIndex} className="flex items-center gap-2 text-sm">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          {resource}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline de Carrière */}
            <div>
              <h4 className="font-semibold mb-3">Projection de Carrière</h4>
              <div className="flex justify-between relative">
                {prediction.timeline.map((step, stepIndex) => (
                  <div key={stepIndex} className="text-center flex-1">
                    <div className="bg-teal-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mx-auto mb-2">
                      {step.year}A
                    </div>
                    <div className="text-xs text-muted-foreground">{step.milestone}</div>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full mt-4 bg-gradient-to-r from-teal-600 to-blue-600">
              <Zap className="h-4 w-4 mr-2" />
              Démarrer le Parcours de Préparation
            </Button>
          </div>
        ))}

        {/* Insights du Marché */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-3">Insights du Marché du Travail</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">+32%</div>
              <div className="text-xs text-muted-foreground">Demande IA</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">$145K</div>
              <div className="text-xs text-muted-foreground">Salaire Moyen</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <div className="text-xs text-muted-foreground">Satisfaction</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">15K+</div>
              <div className="text-xs text-muted-foreground">Postes Ouverts</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
