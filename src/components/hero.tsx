import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="w-full py-20 md:py-32 lg:py-40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-4">
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Maintain a Healthier Codebase
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              Your AI-powered assistant for maintaining a clean, consistent, and up-to-date codebase.
              Spend less time on maintenance and more time building.
            </p>
          </div>
          <div className="space-x-4 pt-6">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="#features">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">View on GitHub</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
