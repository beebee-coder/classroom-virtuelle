// src/components/ExerciseHelper.tsx
'use client';
import { useAIAssistant } from '@/hooks/useDeepSeek'; // Renommé mais le chemin reste le même
import { useState }from 'react';

export function ExerciseHelper({ subject, exercise }: { subject: string; exercise: string }) {
  const [help, setHelp] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const { helpWithHomework, isLoading } = useAIAssistant();

  const handleGetHelp = async () => {
    // Si l'aide est déjà visible, on la cache
    if (isVisible) {
      setIsVisible(false);
      return;
    }
    
    // Si l'aide a déjà été générée, on la réaffiche simplement
    if (help) {
      setIsVisible(true);
      return;
    }

    // Sinon, on appelle l'IA
    const response = await helpWithHomework(subject, exercise);
    setHelp(response);
    setIsVisible(true);
  };

  return (
    <div className="border-l-4 border-blue-400 pl-4 mt-4">
      <button
        onClick={handleGetHelp}
        disabled={isLoading}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
      >
        {isLoading ? '⏳ Aide en cours...' : '💡 Demander de l\'aide'}
      </button>
      
      {isVisible && help && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900">
          <p className="text-sm text-blue-800 dark:text-blue-200">{help}</p>
        </div>
      )}
    </div>
  );
}
