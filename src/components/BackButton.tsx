// src/components/BackButton.tsx
'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function BackButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.back()}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Retour
    </Button>
  );
}
