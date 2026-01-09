// src/components/session/CubeSpinner.tsx
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Liste de phrases d'encouragement pour les élèves
const encouragingPhrases = [
  "Vise Haut",
  "Sois Curieux",
  "Apprends Toujours",
  "Pense Grand",
  "Crois en Toi",
  "Reste Concentré",
];

// Fonction pour mélanger un tableau (algorithme de Fisher-Yates)
const shuffleArray = (array: string[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

export function CubeSpinner() {
  const [faces, setFaces] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(true);

  useEffect(() => {
    // Mélange les phrases pour que l'ordre soit différent à chaque chargement
    setFaces(shuffleArray([...encouragingPhrases]));
  }, []);
  
  const toggleSpin = () => {
    setIsSpinning(prev => !prev);
  }

  if (faces.length < 6) return null;

  return (
    <div className="cube-container">
      <div 
        className="box-card"
        onClick={toggleSpin}
        style={{ animationPlayState: isSpinning ? 'running' : 'paused' }}
        title={isSpinning ? "Cliquer pour arrêter" : "Cliquer pour animer"}
      >
        <div className="face front">{faces[0]}</div>
        <div className="face back">{faces[1]}</div>
        <div className="face right">{faces[2]}</div>
        <div className="face left">{faces[3]}</div>
        <div className="face top">{faces[4]}</div>
        <div className="face bottom">{faces[5]}</div>
      </div>
    </div>
  );
}
