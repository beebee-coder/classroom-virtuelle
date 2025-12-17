// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';
import { cn } from '@/lib/utils';
import { Header } from '@/components/Header'; // Import du Header dynamique

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Classroom Connector',
  description: 'Un espace collaboratif pour enseignants et élèves.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen w-full font-sans antialiased',
          'bg-background text-foreground',
          inter.className
        )}
      >
        <Providers>
          {/* Le Header dynamique est maintenant ici, mais il ne sera pas sur la page d'accueil 
              si celle-ci n'est pas encapsulée par ce layout de manière standard. 
              En pratique, la page d'accueil aura son propre header statique.
          */}
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
