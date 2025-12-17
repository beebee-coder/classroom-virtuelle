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

  // N'affiche pas le Header sur la page d'accueil (/)
  const showHeader = pathname !== '/';

  return (
    <>
      {showHeader && <Header />}
      <main className="flex-1">{children}</main>
      {/* Vous pouvez aussi rendre le Footer conditionnel si nécessaire */}
      {/* {showHeader && <Footer />} */}
    </>
  );
}


export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AppStructure>
                    {children}
                </AppStructure>
            </ThemeProvider>
        </SessionProvider>
    );
}
