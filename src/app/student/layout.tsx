// src/app/student/layout.tsx
'use client';

import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useSession } from "next-auth/react";

// Ce layout client s'assure que le hook de présence est actif pour toutes les pages élèves.
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  
  // Le hook ne doit être actif que si l'utilisateur est authentifié.
  const isEnabled = status === 'authenticated' && !!session?.user?.id && !!session?.user?.classeId;

  // Active le suivi de présence pour l'élève connecté
  useActivityTracker(session?.user?.id, session?.user?.classeId, isEnabled);

  return <>{children}</>;
}
