// src/components/Providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import Footer from './Footer';

// Ce composant interne gère l'affichage conditionnel du Header/Footer
function AppStructure({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  // N'affiche pas le Header sur les pages non authentifiées principales
  const showHeader = pathname !== '/' && pathname !== '/login' && pathname !== '/register';

  return (
    <>
      {/* Le Header est maintenant géré par les layouts spécifiques (ex: teacher/layout) */}
      <main className="flex-1">{children}</main>
    </>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                {children}
            </ThemeProvider>
        </SessionProvider>
    );
}
