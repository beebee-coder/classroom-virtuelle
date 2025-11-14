import { Github, Twitter, Linkedin } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';
import { Button } from '../ui/button';

export function Footer() {
  return (
    <footer className="bg-muted/40 py-8">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Aura Landing. All rights reserved.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="#" aria-label="Twitter">
              <Twitter className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="#" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="#" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}
