'use client';
import { useState } from 'react';
import { Bot } from 'lucide-react';

export function DeepSeekChat() {

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <h3 className="font-semibold">Assistant Pédagogique</h3>
        </div>
      </div>

      {/* Message de maintenance */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col items-center justify-center text-center">
         <Bot className="h-12 w-12 text-gray-400 mb-4" />
        <h4 className="font-semibold text-lg text-gray-700">Fonctionnalité en maintenance</h4>
        <p className="text-gray-500 max-w-sm">
          L'assistant pédagogique est en cours d'amélioration pour vous offrir une expérience encore meilleure. Revenez bientôt !
        </p>
      </div>

      {/* Zone de saisie désactivée */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            placeholder="L'assistant est actuellement indisponible..."
            className="flex-1 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
            rows={2}
            disabled={true}
          />
          <button
            disabled={true}
            className="self-end px-6 py-3 bg-gray-300 text-white rounded-lg cursor-not-allowed"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
