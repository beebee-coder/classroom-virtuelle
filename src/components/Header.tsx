// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { School } from 'lucide-react';
import { UserNav } from './UserNav';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import type { Session } from 'next-auth';
import { useSession } from 'next-auth/react';

interface HeaderProps {
  children?: React.ReactNode;
}

// Ce composant est maintenant un composant client pur
export function Header({ children }: HeaderProps) {
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 min-w-0">
        <Link
          href="/"
          aria-label="Accueil"
          className="flex items-center gap-2 font-bold text-lg text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
        >
          <School className="h-6 w-6" aria-hidden="true" />
          <span>Classroom Connector</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 min-w-0">
          {user?.role === 'PROFESSEUR' && (
            <Button variant="ghost" asChild>
              <Link
                href="/librairie-metiers"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
              >
                Métiers
              </Link>
            </Button>
          )}
          {children}
          <ThemeToggle />
          <UserNav user={user} />
        </nav>
      </div>
    </header>
  );
}
