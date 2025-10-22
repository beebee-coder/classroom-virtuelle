// components/VirtualClassroom.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Orbit, 
  Users, 
  Zap, 
  Globe,
  Brain,
  Share2,
  Video
} from 'lucide-react';

interface VRScenario {
  id: string;
  title: string;
  description: string;
  type: 'simulation' | 'collaboration' | 'exploration';
  duration: number;
  skills: string[];
  participants: number;
  intensity: 'low' | 'medium' | 'high';
}

export function VirtualClassroom() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  
  const scenarios: VRScenario[] = [
    {
      id: '1',
      title: 'Mission Mars Collaborative',
      description: 'Résolvez des problèmes scientifiques en équipe sur Mars',
      type: 'collaboration',
      duration: 45,
      skills: ['Résolution de problèmes', 'Collaboration', 'Pensée scientifique'],
      participants: 4,
      intensity: 'high'
    },
    {
      id: '2',
      title: 'Simulation de Négociation Internationale',
      description: 'Négociez un accord climatique avec des leaders mondiaux',
      type: 'simulation',
      duration: 60,
      skills: ['Communication', 'Négociation', 'Pensée critique'],
      participants: 6,
      intensity: 'medium'
    },
    {
      id: '3',
      title: 'Exploration du Cerveau Humain',
      description: 'Voyagez à travers les neurones et synapses',
      type: 'exploration',
      duration: 30,
      skills: ['Curiosité', 'Apprentissage visuel', 'Mémorisation'],
      participants: 1,
      intensity: 'low'
    }
  ];

  const startVRScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    // Intégration avec WebXR API
    if (navigator.xr) {
      navigator.xr.requestSession('immersive-vr').then((session) => {
        console.log('Session VR démarrée:', session);
        // Logique de démarrage de l'expérience VR
      });
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Orbit className="h-5 w-5" />
          Classe Virtuelle - Réalité Immersive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scénarios VR */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(scenario => (
            <div 
              key={scenario.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all hover:scale-105 ${
                activeScenario === scenario.id 
                  ? 'border-orange-500 bg-orange-50 shadow-lg' 
                  : 'border-gray-200 bg-white'
              }`}
              onClick={() => startVRScenario(scenario.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <Badge className={getIntensityColor(scenario.intensity)}>
                  {scenario.intensity}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {scenario.participants}
                </div>
              </div>
              
              <h4 className="font-semibold mb-2">{scenario.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {scenario.description}
              </p>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {scenario.skills.map(skill => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{scenario.duration} min</span>
                <Button size="sm" variant="outline">
                  <Zap className="h-3 w-3 mr-1" />
                  Démarrer
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Contrôles de Session */}
        <div className="bg-white rounded-lg p-4 border">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-600" />
              Contrôles de Session
            </h4>
            <Badge variant="secondary">VR Ready</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="flex flex-col h-16">
              <Share2 className="h-4 w-4 mb-1" />
              <span className="text-xs">Partager Écran</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col h-16">
              <Brain className="h-4 w-4 mb-1" />
              <span className="text-xs">Tableau 3D</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col h-16">
              <Users className="h-4 w-4 mb-1" />
              <span className="text-xs">Groupes VR</span>
            </Button>
            
            <Button variant="outline" className="flex flex-col h-16">
              <Globe className="h-4 w-4 mb-1" />
              <span className="text-xs">Monde Partagé</span>
            </Button>
          </div>
        </div>

        {/* Statistiques d'Immersion */}
        <div className="bg-black text-white rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            Métriques d'Immersion
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">94%</div>
              <div className="text-xs text-gray-400">Engagement</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">87%</div>
              <div className="text-xs text-gray-400">Retention</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">3.2x</div>
              <div className="text-xs text-gray-400">Efficacité</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
