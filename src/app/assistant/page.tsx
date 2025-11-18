
// src/app/assistant/page.tsx
import { AssistantChat } from '@/components/AssistantChat';

export default function AssistantPage() {
  return (
    <div className="container mx-auto p-4 max-w-4xl h-full flex flex-col">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Assistant Pédagogique</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Posez vos questions de maths, français ou sciences. Je suis là pour vous aider !
        </p>
      </div>
      
      <div className="flex-1 min-h-0">
        <AssistantChat />
      </div>
    </div>
  );
}

    