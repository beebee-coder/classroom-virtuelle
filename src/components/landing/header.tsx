import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-bold font-headline text-lg">Aura Landing</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="#cta">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
