// components/AttentionTracker.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Eye, 
  Target, 
  Zap, 
  Users,
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react';

interface AttentionData {
  studentId: string;
  name: string;
  attention: number;
  isFocused: boolean;
  lastFocusChange: Date;
  totalFocusedTime: number;
  distractions: number;
}

export function AttentionTracker() {
  const [attentionData, setAttentionData] = useState<AttentionData[]>([
    {
      studentId: '1',
      name: 'Marie Dubois',
      attention: 92,
      isFocused: true,
      lastFocusChange: new Date(),
      totalFocusedTime: 25,
      distractions: 2
    },
    {
      studentId: '2',
      name: 'Jean Martin',
      attention: 45,
      isFocused: false,
      lastFocusChange: new Date(Date.now() - 120000),
      totalFocusedTime: 8,
      distractions: 7
    },
    {
      studentId: '3',
      name: 'Sophie Lambert',
      attention: 78,
      isFocused: true,
      lastFocusChange: new Date(),
      totalFocusedTime: 22,
      distractions: 3
    }
  ]);

  const [classAttention, setClassAttention] = useState({
    average: 72,
    trend: 'up' as 'up' | 'down' | 'stable',
    focusedStudents: 2,
    totalStudents: 3
  });

  // Simulation des données d'attention en temps réel
  useEffect(() => {
    const interval = setInterval(() => {
      setAttentionData(prev => prev.map(student => {
        const change = (Math.random() - 0.5) * 20;
        const newAttention = Math.max(0, Math.min(100, student.attention + change));
        const isFocused = newAttention > 60;
        
        return {
          ...student,
          attention: newAttention,
          isFocused,
          lastFocusChange: isFocused !== student.isFocused ? new Date() : student.lastFocusChange,
          totalFocusedTime: isFocused ? student.totalFocusedTime + 0.1 : student.totalFocusedTime,
          distractions: !isFocused && student.isFocused ? student.distractions + 1 : student.distractions
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getAttentionColor = (attention: number) => {
    if (attention > 80) return 'text-green-600';
    if (attention > 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFocusStatus = (student: AttentionData) => {
    if (student.attention > 80) return { text: 'Très concentré', color: 'bg-green-100 text-green-800' };
    if (student.attention > 60) return { text: 'Concentré', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Distrait', color: 'bg-red-100 text-red-800' };
  };

  const recaptureAttention = (studentId: string) => {
    // Action pour recapturer l'attention d'un étudiant
    setAttentionData(prev => prev.map(s => 
      s.studentId === studentId ? { ...s, attention: 85, isFocused: true } : s
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Suivi de l'Attention
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {classAttention.focusedStudents}/{classAttention.totalStudents} concentrés
            </Badge>
            <Badge variant={classAttention.average > 70 ? "default" : "destructive"}>
              Moyenne: {classAttention.average}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiques de Classe */}
        <div className="grid grid-cols-4 gap-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {classAttention.average}%
            </div>
            <div className="text-xs text-muted-foreground">Attention moyenne</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {attentionData.filter(s => s.isFocused).length}
            </div>
            <div className="text-xs text-muted-foreground">Concentrés</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {attentionData.reduce((sum, s) => sum + s.distractions, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Distractions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.max(...attentionData.map(s => s.totalFocusedTime))}m
            </div>
            <div className="text-xs text-muted-foreground">Record focus</div>
          </div>
        </div>

        {/* Détail par Étudiant */}
        <div className="space-y-3">
          {attentionData.map(student => {
            const focusStatus = getFocusStatus(student);
            
            return (
              <div key={student.studentId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  {/* Indicateur Visuel */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      student.isFocused ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Target className={`h-5 w-5 ${
                        student.isFocused ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    {!student.isFocused && (
                      <div className="absolute -top-1 -right-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </div>
                    )}
                  </div>

                  {/* Informations */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{student.name}</span>
                      <Badge className={focusStatus.color}>
                        {focusStatus.text}
                      </Badge>
                    </div>
                    
                    {/* Barre de Progression */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            student.isFocused ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.attention}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${getAttentionColor(student.attention)}`}>
                        {student.attention}%
                      </span>
                    </div>

                    {/* Métriques Supplémentaires */}
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {student.totalFocusedTime}m focus
                      </div>
                      <div>
                        {student.distractions} distractions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!student.isFocused && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => recaptureAttention(student.studentId)}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Recapturer
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions de Groupe */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Activité de Groupe
          </Button>
          <Button variant="outline" className="flex-1">
            <Users className="h-4 w-4 mr-2" />
            Session Interactive
          </Button>
          <Button variant="default" className="flex-1">
            <Zap className="h-4 w-4 mr-2" />
            Boost d'Attention
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
