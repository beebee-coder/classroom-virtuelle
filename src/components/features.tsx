import { BookOpen, Database, Github } from 'lucide-react';
import CodebaseAudit from './codebase-audit';
import FeatureCard from './feature-card';
import ToolInclusionChecker from './tool-inclusion-checker';
import { VercelIcon } from './icons/vercel-icon';

export default function Features() {
  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Core Features</div>
            <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">
              Your AI-Powered Co-Pilot
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Leverage AI and modern development practices to ensure your codebase is clean, consistent, and easy to maintain.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:max-w-none lg:grid-cols-3 pt-12">
          <ToolInclusionChecker />
          <CodebaseAudit />
          <FeatureCard
            icon={<Database className="h-6 w-6 text-foreground" />}
            title="PostgreSQL + Prisma"
            description="Robust, type-safe database integration using PostgreSQL and Prisma ORM for reliable data management."
          />
          <FeatureCard
            icon={<VercelIcon className="h-6 w-6 text-foreground" />}
            title="Vercel Deployment"
            description="Seamless, production-ready deployment configured for the Vercel platform, with zero-config deployments."
          />
          <FeatureCard
            icon={<Github className="h-6 w-6 text-foreground" />}
            title="GitHub Integration"
            description="Keep your project in sync. Includes scripts for maintaining up-to-date documentation via data ingestion."
          />
          <FeatureCard
            icon={<BookOpen className="h-6 w-6 text-foreground" />}
            title="Reference Guide"
            description="In-app documentation providing a complete guide to the codebase structure and features."
          />
        </div>
      </div>
    </section>
  );
}
