import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, Mountain } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <Mountain className="h-6 w-6 text-primary" />
            <span className="font-bold">Classroom Connector</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link
              href="/#features"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Fonctionnalités
            </Link>
            <Link
              href="/#contact"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Contact
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/login">S'inscrire</Link>
            </Button>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <nav className="grid gap-6 text-lg font-medium mt-10">
                <SheetClose asChild>
                  <Link href="/" className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <Mountain className="h-6 w-6 text-primary" />
                    <span>Classroom Connector</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/#features" className="text-muted-foreground hover:text-foreground">
                    Fonctionnalités
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/#contact" className="text-muted-foreground hover:text-foreground">
                    Contact
                  </Link>
                </SheetClose>
                <div className="mt-4 pt-4 border-t">
                  <SheetClose asChild>
                    <Button className="w-full mb-2" variant="ghost" asChild><Link href="/login">Se connecter</Link></SheetClose>
                  </SheetClose>
                   <SheetClose asChild>
                    <Button className="w-full" asChild><Link href="/login">S'inscrire</Link></Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
