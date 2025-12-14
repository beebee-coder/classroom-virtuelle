// src/components/SessionLoading.tsx
'use client';

import { Loader2, Mic, Video, MonitorSmartphone, FilePenLine } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const features = [
  { icon: Mic, label: 'Audio', color: 'text-green-500' },
  { icon: Video, label: 'Vidéo', color: 'text-green-500' },
  { icon: MonitorSmartphone, label: "Partage d'écran", color: 'text-blue-500' },
  { icon: FilePenLine, label: 'Tableau blanc', color: 'text-blue-500' },
];

export default function SessionLoading() {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        // Simule une montée progressive avec petites pauses (plus réaliste)
        return p + Math.random() * 8 + 2;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icône animée centrale – plus moderne que le spinner brut */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0,
          }}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="bg-primary/10 p-4 rounded-full">
              <Loader2 className="h-10 w-10 text-primary" aria-hidden="true" />
            </div>
            {/* Cercle concentrique subtil */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-20"></div>
          </div>
        </motion.div>

        {/* Texte de chargement – typographie plus aérée */}
        <div className="space-y-2 px-2">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Préparation de la session
          </h2>
          <p className="text-muted-foreground text-sm">
            Nous initialisons votre environnement de cours en ligne…
          </p>
        </div>

        {/* Barre de progression – simulation réaliste */}
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: '15%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </div>

        {/* Grille de fonctionnalités – icônes Lucide + état visuel */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.3 }}
              className="flex items-center gap-2.5 text-sm text-muted-foreground"
            >
              <div className="relative flex items-center justify-center">
                <feature.icon className={`h-4 w-4 ${feature.color}`} aria-hidden="true" />
                {/* Point de statut animé */}
                <motion.div
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-current"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                />
              </div>
              <span>{feature.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Note discrète (optionnel mais rassurant) */}
        <p className="text-xs text-muted-foreground/70 mt-2">
          Cela prend généralement moins de 10 secondes…
        </p>
      </div>
    </div>
  );
}