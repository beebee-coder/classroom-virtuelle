// src/components/CompetitionDashboard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
} from 'lucide-react';
import { TaskManager } from './TaskManager';
import { LeaderboardDisplay } from './LeaderboardDisplay';
import { ProgressTracker } from './ProgressTracker';

export function CompetitionDashboard() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'leaderboard' | 'progress'>('tasks');
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Challenge Éducatif 2024
            </h1>
            <p className="text-muted-foreground mt-2">
            Accumule des points, monte dans le classement et deviens le champion de ta classe !
            </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiques Personnelles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
            <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">1,250</div>
                <div className="text-sm text-muted-foreground">Points Totaux</div>
            </CardContent>
            </Card>
            <Card>
            <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">#3</div>
                <div className="text-sm text-muted-foreground">Classement</div>
            </CardContent>
            </Card>
            <Card>
            <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">42</div>
                <div className="text-sm text-muted-foreground">Tâches Réussies</div>
            </CardContent>
            </Card>
            <Card>
            <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">7</div>
                <div className="text-sm text-muted-foreground">Jours Actifs</div>
            </CardContent>
            </Card>
        </div>

        {/* Navigation par Onglets */}
        <div className="flex border-b">
            <Button
            variant={activeTab === 'tasks' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('tasks')}
            className="flex-1 rounded-none"
            >
            <Target className="h-4 w-4 mr-2" />
            Mes Tâches
            </Button>
            <Button
            variant={activeTab === 'leaderboard' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('leaderboard')}
            className="flex-1 rounded-none"
            >
            <Trophy className="h-4 w-4 mr-2" />
            Classement
            </Button>
            <Button
            variant={activeTab === 'progress' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('progress')}
            className="flex-1 rounded-none"
            >
            <TrendingUp className="h-4 w-4 mr-2" />
            Ma Progression
            </Button>
        </div>

        {/* Contenu des Onglets */}
        <div>
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'leaderboard' && <LeaderboardDisplay />}
            {activeTab === 'progress' && <ProgressTracker />}
        </div>
      </CardContent>
    </Card>
  );
}
