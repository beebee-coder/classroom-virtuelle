// src/components/session/CubeSpinner.tsx
'use client';

import { useState, useEffect } from 'react';

const adjectives = ["Brave", "Calme", "Agile", "Sage", "Rapide", "Doux"];
const nouns = ["Lion", "Rivière", "Étoile", "Aigle", "Forêt", "Océan"];

const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function CubeSpinner() {
  const [faces, setFaces] = useState<string[]>([]);

  useEffect(() => {
    // Génère 6 noms de face uniques au chargement
    const newFaces = Array.from({ length: 6 }, () => {
        const adj = getRandomItem(adjectives);
        const noun = getRandomItem(nouns);
        return `${adj} ${noun}`;
    });
    setFaces(newFaces);
  }, []);

  if (faces.length < 6) return null;

  return (
    <div className="cube-container">
      <div className="box-card">
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
