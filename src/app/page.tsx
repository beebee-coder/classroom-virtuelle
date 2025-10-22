import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BookOpen, Users, Video } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  const features = [
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Gestion de Classe Intuitive",
      description: "Créez des classes, ajoutez des élèves et suivez leur progression en un seul endroit.",
      imageUrl: "https://picsum.photos/seed/class-management/600/400",
      imageHint: "classroom management"
    },
    {
      icon: <BookOpen className="w-8 h-8 text-primary" />,
      title: "Tâches et Validations",
      description: "Assignez des tâches quotidiennes, hebdomadaires ou mensuelles et validez les soumissions de vos élèves en quelques clics.",
      imageUrl: "https://picsum.photos/seed/task-validation/600/400",
      imageHint: "tasks validation"
    },
    {
      icon: <Video className="w-8 h-8 text-primary" />,
      title: "Sessions Vidéo en Direct",
      description: "Lancez des cours interactifs en direct avec partage d'écran, tableau blanc et suivi de la compréhension.",
      imageUrl: "https://picsum.photos/seed/live-session/600/400",
      imageHint: "live session"
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid lg:grid-cols-2 gap-12 items-center py-20 md:py-32">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Connectez, Enseignez, <span className="text-primary">Inspirez</span>.
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              Classroom Connector est la plateforme tout-en-un pour une gestion de classe moderne et interactive. Simplifiez votre quotidien et engagez vos élèves comme jamais auparavant.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button size="lg" asChild>
                <Link href="/login">
                  Commencer <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="w-full">
            <Image
              src="https://picsum.photos/seed/hero-classroom/1200/800"
              alt="Une salle de classe moderne et connectée"
              width={1200}
              height={800}
              className="rounded-xl shadow-2xl aspect-video object-cover"
              data-ai-hint="modern classroom"
              priority
            />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 bg-card">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Des outils puissants pour les éducateurs
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg">
                Tout ce dont vous avez besoin pour créer un environnement d'apprentissage dynamique et efficace.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col overflow-hidden">
                  <Image
                    src={feature.imageUrl}
                    alt={feature.title}
                    width={600}
                    height={400}
                    className="aspect-video object-cover"
                    data-ai-hint={feature.imageHint}
                  />
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      {feature.icon}
                      <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Prêt à transformer votre enseignement ?
            </h2>
            <p className="max-w-[600px] mx-auto mt-4 text-primary-foreground/80 md:text-lg">
              Inscrivez-vous dès aujourd'hui et découvrez une nouvelle façon d'interagir avec vos élèves.
            </p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/login">
                  Rejoindre Classroom Connector <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
