// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';
import { cn } from '@/lib/utils';
// Le Header est retiré d'ici pour être géré par chaque page ou layout spécifique

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
          {/* Le Header a été retiré. Les pages individuelles le géreront. */}
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
