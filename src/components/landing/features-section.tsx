import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Code, GitBranch, Rocket } from 'lucide-react';

const features = [
  {
    icon: <Code className="h-8 w-8 text-primary" />,
    title: 'Next.js 15 & RSC',
    description: 'Built with the latest features of Next.js, including App Router and React Server Components for optimal performance.',
  },
  {
    icon: <GitBranch className="h-8 w-8 text-primary" />,
    title: 'CI/CD Ready',
    description: 'Comes with pre-configured scripts for linting, type-checking, and seamless deployment to Vercel via GitHub.',
  },
  {
    icon: <Rocket className="h-8 w-8 text-primary" />,
    title: 'Database & ORM',
    description: 'Integrated with Prisma and PostgreSQL, providing a robust backend setup right out of the box.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/40">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Everything You Need to Launch</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Aura Landing is packed with features to help you get started quickly.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center p-4 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                <CardDescription className="mt-2 text-base">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
