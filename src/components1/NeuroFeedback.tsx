// components/NeuroFeedback.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  Zap,
  TrendingUp,
  Activity,
  Focus,
  Waves
} from 'lucide-react';

interface BrainwaveData {
  alpha: number;
  beta: number;
  theta: number;
  gamma: number;
  focus: number;
  relaxation: number;
}

export function NeuroFeedback() {
  const [brainwaves, setBrainwaves] = useState<BrainwaveData>({
    alpha: 45,
    beta: 35,
    theta: 15,
    gamma: 5,
    focus: 65,
    relaxation: 70
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(() => {
        setBrainwaves(prev => ({
          alpha: Math.max(0, Math.min(100, prev.alpha + (Math.random() - 0.5) * 10)),
          beta: Math.max(0, Math.min(100, prev.beta + (Math.random() - 0.5) * 8)),
          theta: Math.max(0, Math.min(100, prev.theta + (Math.random() - 0.5) * 6)),
          gamma: Math.max(0, Math.min(100, prev.gamma + (Math.random() - 0.5) * 4)),
          focus: Math.max(0, Math.min(100, prev.focus + (Math.random() - 0.5) * 12)),
          relaxation: Math.max(0, Math.min(100, prev.relaxation + (Math.random() - 0.5) * 10))
        }));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const getOptimalState = () => {
    const { alpha, beta, theta, focus } = brainwaves;
    
    if (focus > 80 && beta > 60) return { state: 'Concentration Maximale', color: 'text-green-600' };
    if (alpha > 60 && focus > 70) return { state: 'Flow State', color: 'text-blue-600' };
    if (theta > 40) return { state: 'Créativité Élevée', color: 'text-purple-600' };
    return { state: 'État Standard', color: 'text-gray-600' };
  };

  const optimalState = getOptimalState();

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-700">
          <Brain className="h-5 w-5" />
          NeuroFeedback - Optimisation Cognitive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* État Cérébral Actuel */}
        <div className="text-center">
          <div className={`text-2xl font-bold mb-2 ${optimalState.color}`}>
            {optimalState.state}
          </div>
          <div className="text-sm text-muted-foreground">
            État cognitif optimal pour l'apprentissage
          </div>
        </div>

        {/* Ondes Cérébrales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'alpha' as const, label: 'Alpha', color: 'bg-blue-500', description: 'Relaxation consciente' },
            { key: 'beta' as const, label: 'Beta', color: 'bg-green-500', description: 'Concentration active' },
            { key: 'theta' as const, label: 'Theta', color: 'bg-purple-500', description: 'Créativité' },
            { key: 'gamma' as const, label: 'Gamma', color: 'bg-red-500', description: 'Traitement complexe' }
          ].map(wave => (
            <div key={wave.key} className="text-center">
              <div className="flex justify-between text-sm mb-1">
                <span>{wave.label}</span>
                <span>{brainwaves[wave.key].toFixed(0)}%</span>
              </div>
              <Progress value={brainwaves[wave.key]} className="h-2 mb-1" />
              <div className="text-xs text-muted-foreground">{wave.description}</div>
            </div>
          ))}
        </div>

        {/* Métriques de Performance */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border text-center">
            <Focus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{brainwaves.focus.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Niveau de Focus</div>
          </div>
          <div className="bg-white rounded-lg p-4 border text-center">
            <Waves className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{brainwaves.relaxation.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground">Relaxation</div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsMonitoring(!isMonitoring)}
            className="flex-1"
            variant={isMonitoring ? "destructive" : "default"}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isMonitoring ? 'Arrêter le Monitoring' : 'Démarrer le Monitoring'}
          </Button>
          
          <Button className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <Zap className="h-4 w-4 mr-2" />
            Session d'Optimisation
          </Button>
        </div>

        {/* Recommandations */}
        <div className="bg-white rounded-lg p-4 border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Recommandations Neuro-Scientifiques
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Période idéale pour l'apprentissage complexe (beta élevé)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Suggestions créatives recommandées (theta optimal)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Maintenir cet état pour 25 minutes supplémentaires</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
