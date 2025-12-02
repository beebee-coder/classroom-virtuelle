import { Logo } from "./icons/logo";

export default function Footer() {
  return (
    <footer className="w-full border-t">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Codebase Companion.
          </p>
        </div>
      </div>
    </footer>
  );
}
