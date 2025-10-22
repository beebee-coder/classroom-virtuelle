// components/AISkillAssessment.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  MessageSquare, 
  Code, 
  Users, 
  Lightbulb,
  Star,
  TrendingUp
} from 'lucide-react';

interface AssessmentResult {
  skill: string;
  confidence: number;
  level: number;
  feedback: string;
  recommendations: string[];
  strengths: string[];
  areasForImprovement: string[];
}

export function AISkillAssessment() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AssessmentResult[] | null>(null);

  const analyzeSession = async () => {
    setIsAnalyzing(true);
    // Simulation d'analyse IA
    setTimeout(() => {
      setResults([
        {
          skill: 'Communication',
          confidence: 0.89,
          level: 72,
          feedback: 'Excellente capacité à articuler les idées, mais pourrait améliorer la concision.',
          recommendations: [
            'Pratiquer la synthèse en 30 secondes',
            'Exercices de reformulation',
            'Participation à des débats chronométrés'
          ],
          strengths: ['Clarté', 'Vocabulaire étendu', 'Écoute active'],
          areasForImprovement: ['Concision', 'Structure des arguments']
        },
        {
          skill: 'Résolution de problèmes',
          confidence: 0.94,
          level: 68,
          feedback: 'Approche méthodique mais manque de pensée latérale.',
          recommendations: [
            'Exercices de pensée divergente',
            'Résolution de problèmes sous contraintes',
            'Analyse de cas complexes'
          ],
          strengths: ['Logique', 'Persévérance', 'Analyse systématique'],
          areasForImprovement: ['Créativité', 'Flexibilité cognitive']
        }
      ]);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Analyse IA des Compétences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!results ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Analyse des Compétences</h3>
            <p className="text-muted-foreground mb-4">
              L'IA analysera les interactions pour évaluer le niveau de compétences
            </p>
            <Button onClick={analyzeSession} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Démarrer l'analyse
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      {result.skill}
                      <Badge variant="secondary">Niveau {result.level}</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Confiance de l'analyse: {(result.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.ceil(result.level / 20)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progression</span>
                    <span>{result.level}%</span>
                  </div>
                  <Progress value={result.level} className="h-2" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-semibold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Points Forts
                    </h5>
                    <ul className="space-y-1">
                      {result.strengths.map((strength, i) => (
                        <li key={i} className="text-green-700">✓ {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2 flex items-center gap-1">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                      Axes d'amélioration
                    </h5>
                    <ul className="space-y-1">
                      {result.areasForImprovement.map((area, i) => (
                        <li key={i} className="text-orange-700">● {area}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="font-semibold mb-2 flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    Recommandations
                  </h5>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="bg-blue-100 text-blue-700 rounded-full p-1 mt-0.5">
                          <Lightbulb className="h-3 w-3" />
                        </div>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}