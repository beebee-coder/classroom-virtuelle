// src/components/Providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

// Déplacer l'initialisation de la police ici
const inter = Inter({
  subsets: ['latin'],
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className={cn('min-h-screen font-sans antialiased', inter.className)}>
                    {children}
                </div>
            </ThemeProvider>
        </SessionProvider>
    );
}
