// components/EmotionalAITutor.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  Zap, 
  MessageCircle,
  TrendingUp,
  Sparkles,
  Camera
} from 'lucide-react';

interface EmotionalState {
  engagement: number;
  confidence: number;
  frustration: number;
  curiosity: number;
}

export function EmotionalAITutor() {
  const [emotionalState, setEmotionalState] = useState<EmotionalState>({
    engagement: 75,
    confidence: 60,
    frustration: 20,
    curiosity: 80
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startEmotionAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulation d'analyse émotionnelle en temps réel
    const interval = setInterval(() => {
      setEmotionalState(prev => ({
        engagement: Math.min(100, prev.engagement + (Math.random() - 0.3) * 10),
        confidence: Math.min(100, prev.confidence + (Math.random() - 0.2) * 8),
        frustration: Math.max(0, prev.frustration + (Math.random() - 0.6) * 5),
        curiosity: Math.min(100, prev.curiosity + (Math.random() - 0.4) * 6)
      }));
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      setIsAnalyzing(false);
    }, 10000);
  };

  const getIntervention = () => {
    if (emotionalState.frustration > 60) {
      return {
        type: 'support' as const,
        message: "Je détecte une frustration. Pause recommandée avec exercice de respiration.",
        action: "Démarrer la méditation guidée",
        urgency: 'high'
      };
    }
    if (emotionalState.engagement < 50) {
      return {
        type: 'engagement' as const,
        message: "Niveau d'engagement faible. Proposer une activité gamifiée ?",
        action: "Activer le mode défi",
        urgency: 'medium'
      };
    }
    if (emotionalState.confidence > 80) {
      return {
        type: 'challenge' as const,
        message: "Confiance élevée ! Moment idéal pour un défi complexe.",
        action: "Lancer le défi expert",
        urgency: 'low'
      };
    }
    return null;
  };

  const intervention = getIntervention();

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Brain className="h-5 w-5" />
          Tuteur IA - Intelligence Émotionnelle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analyse en Temps Réel */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(emotionalState).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{key}</span>
                <span>{Math.round(value)}%</span>
              </div>
              <Progress value={value} className="h-2" />
            </div>
          ))}
        </div>

        {/* Intervention IA */}
        {intervention && (
          <div className={`p-4 rounded-lg border-l-4 ${
            intervention.urgency === 'high' 
              ? 'border-l-red-500 bg-red-50' 
              : intervention.urgency === 'medium'
              ? 'border-l-yellow-500 bg-yellow-50'
              : 'border-l-green-500 bg-green-50'
          }`}>
            <div className="flex items-start gap-3">
              <Heart className={`h-5 w-5 mt-0.5 ${
                intervention.urgency === 'high' ? 'text-red-600' :
                intervention.urgency === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
              <div className="flex-1">
                <p className="font-medium mb-2">{intervention.message}</p>
                <Button size="sm" variant={
                  intervention.urgency === 'high' ? 'destructive' : 'default'
                }>
                  <Zap className="h-3 w-3 mr-1" />
                  {intervention.action}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Contrôles du Tutor */}
        <div className="flex gap-3">
          <Button 
            onClick={startEmotionAnalysis} 
            disabled={isAnalyzing}
            variant="outline"
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyse en cours...' : 'Démarrer analyse'}
          </Button>
          
          <Button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Session Personnalisée
          </Button>
        </div>

        {/* Suggestions d'Adaptation */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            Recommandations Pédagogiques
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Rythme d'apprentissage optimal détecté</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Proposer des défis visuo-spatiaux</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Session collaborative recommandée dans 15min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
