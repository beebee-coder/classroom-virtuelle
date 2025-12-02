import Link from "next/link";
import { Button } from "./ui/button";
import { Github } from "lucide-react";
import { Logo } from "./icons/logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-headline text-lg font-bold">
            Codebase Companion
          </span>
        </Link>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" asChild>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
              <Github className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
