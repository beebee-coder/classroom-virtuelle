import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section id="cta" className="py-20 bg-primary text-primary-foreground">
      <div className="container text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-headline">Ready to build your masterpiece?</h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
          Stop waiting. Start building. Aura Landing gives you the foundation you need.
        </p>
        <div className="mt-8">
          <Button size="lg" variant="secondary" asChild>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer">
              Get the Code on GitHub
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
