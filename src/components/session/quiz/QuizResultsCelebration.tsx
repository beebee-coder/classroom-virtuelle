// src/components/session/quiz/QuizResultsCelebration.tsx
'use client';

import { useState, useEffect, useRef } from 'react'; // ✅ useRef ajouté
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Crown, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopStudent {
  userId: string;
  name: string;
  score: number;
  rank: 1 | 2 | 3;
}

interface QuizResultsCelebrationProps {
  quizTitle: string;
  topStudents: TopStudent[];
  onClose: () => void;
}

const rankConfig = {
  1: { icon: Crown, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: '1er' },
  2: { icon: Trophy, color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: '2e' },
  3: { icon: Medal, color: 'text-amber-700', bgColor: 'bg-amber-700/10', label: '3e' },
} as const;

export function QuizResultsCelebration({ quizTitle, topStudents, onClose }: QuizResultsCelebrationProps) {
  const [showResults, setShowResults] = useState(false);
  const [autoClose, setAutoClose] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null); // ✅

  useEffect(() => {
    const timer = setTimeout(() => setShowResults(true), 800);
    const autoCloseTimer = setTimeout(() => setAutoClose(true), 6000);
    return () => {
      clearTimeout(timer);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      clearTimeout(autoCloseTimer); // Précaution
    };
  }, []);

  useEffect(() => {
    if (autoClose) {
      autoCloseTimerRef.current = setTimeout(onClose, 1000);
      return () => {
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      };
    }
  }, [autoClose, onClose]);

  const handleClose = () => {
    // ✅ Annule le timer automatique si l'utilisateur clique
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl">
          <CardContent className="p-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Star className="h-12 w-12 mx-auto text-yellow-400 mb-3" />
              <h2 className="text-2xl font-bold text-foreground mb-1">Bravo à tous !</h2>
              <p className="text-muted-foreground mb-6">Classement du quiz : <strong>{quizTitle}</strong></p>
            </motion.div>

            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center gap-4 flex-wrap"
                >
                  {topStudents.map((student) => {
                    const RankIcon = rankConfig[student.rank].icon;
                    return (
                      <motion.div
                        key={student.userId}
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl",
                          rankConfig[student.rank].bgColor
                        )}
                      >
                        <RankIcon className={cn("h-8 w-8 mb-2", rankConfig[student.rank].color)} />
                        <span className="font-semibold text-sm">{rankConfig[student.rank].label}</span>
                        <span className="text-xs mt-1 truncate max-w-[100px]">{student.name}</span>
                        <span className="text-xs mt-1 font-mono">+{student.score} pts</span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 4.5 }}
              className="mt-8"
            >
              <Button 
                onClick={handleClose} // ✅ Utilise handleClose au lieu de onClose directement
                disabled={autoClose}
                className="w-full"
              >
                {autoClose ? 'Retour à la session...' : 'Revenir à la session'}
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}