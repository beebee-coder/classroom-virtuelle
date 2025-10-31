// src/app/assistant/page.tsx
import { DeepSeekChat } from '@/components/DeepSeekChat';

export default function AssistantPage() {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Assistant Pédagogique</h1>
      <p className="text-gray-600 mb-8">
        Cette fonctionnalité est en cours de refonte pour intégrer des outils plus puissants.
      </p>
      
      <div className="h-[600px]">
        <DeepSeekChat />
      </div>
    </div>
  );
}
