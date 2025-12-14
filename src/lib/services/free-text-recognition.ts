// src/lib/services/free-text-recognition.ts
'use client';

import { createWorker, PSM } from 'tesseract.js';

export class FreeTextRecognitionService {
  private worker: Tesseract.Worker | null = null;
  private readonly educationalDictionary: Set<string>;
  private readonly commonCorrections: Map<string, string>;

  constructor() {
    this.educationalDictionary = new Set([
      'bonjour', 'merci', 'savoir', 'comprendre', 'apprendre', 'élève', 'professeur',
      'mathématiques', 'français', 'histoire', 'géographie', 'sciences', 'cours',
      'exercice', 'devoir', 'leçon', 'école', 'classe', 'tableau', 'écrire', 'lire',
      'calculer', 'résoudre', 'enseigner', 'étudier', 'réviser'
    ]);
    this.commonCorrections = new Map([
      ['bonjoure', 'bonjour'], ['bonjout', 'bonjour'],
      ['mathematique', 'mathématiques'],
      ['francais', 'français'],
      ['savan', 'savant'], ['sava', 'savoir'],
      ['conprendre', 'comprendre'],
      ['aprendre', 'apprendre'],
      ['eleve', 'élève'],
      ['profeseur', 'professeur'],
    ]);
  }

  async initialize(logger?: (m: any) => void) {
    if (this.worker) return;
    this.worker = await createWorker('fra', 1, { logger });
    await this.worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
  }

  async recognizeAndCorrect(
    image: string, 
    logger: (m: any) => void
  ): Promise<{ original: string; corrected: string; confidence: number } | null> {
    if (!this.worker) await this.initialize(logger);
    
    try {
      logger({ status: 'recognizing', progress: 0.5 });
      const { data } = await this.worker!.recognize(image);
      logger({ status: 'recognized', progress: 1 });

      if (data.confidence < 40) {
        console.warn(`[OCR] Confiance trop faible (${data.confidence}) pour: "${data.text.trim()}"`);
        return null;
      }
      
      const correctedText = await this.correctText(data.text);
      
      return {
        original: data.text.trim(),
        corrected: correctedText,
        confidence: data.confidence
      };
    } catch (error) {
      console.error('Erreur de reconnaissance Tesseract:', error);
      return null;
    }
  }

  private async correctText(text: string): Promise<string> {
    let corrected = text.toLowerCase().trim();
    
    this.commonCorrections.forEach((correct, wrong) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(regex, correct);
    });

    const words = corrected.split(/\s+/);
    const correctedWords = await Promise.all(
      words.map(word => this.correctSingleWord(word))
    );

    return correctedWords.join(' ');
  }

  private async correctSingleWord(word: string): Promise<string> {
    if (word.length <= 2 || !/^[a-zA-Zà-üÀ-Ü]+$/.test(word)) return word;
    if (this.educationalDictionary.has(word)) return word;

    let bestMatch = word;
    let minDistance = Infinity;

    for (const dictWord of this.educationalDictionary) {
      const distance = this.levenshteinDistance(word, dictWord);
      if (distance < minDistance && distance <= Math.floor(word.length / 3)) {
        minDistance = distance;
        bestMatch = dictWord;
      }
    }

    return bestMatch;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => 
      Array(a.length + 1).fill(null)
    );

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}