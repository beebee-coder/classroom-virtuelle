import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Component, Paintbrush, Quote, Star, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Find images from placeholder data
const heroImage = PlaceHolderImages.find(img => img.id === 'hero-image');
const feature1Image = PlaceHolderImages.find(img => img.id === 'feature-1');
const feature2Image = PlaceHolderImages.find(img => img.id === 'feature-2');
const feature3Image = PlaceHolderImages.find(img => img.id === 'feature-3');
const avatar1 = PlaceHolderImages.find(img => img.id === 'avatar-1');
const avatar2 = PlaceHolderImages.find(img => img.id === 'avatar-2');
const avatar3 = PlaceHolderImages.find(img => img.id === 'avatar-3');


export default function Home() {
  const features = [
    {
      icon: <Paintbrush className="w-8 h-8 text-primary" />,
      title: "Visualize Instantly",
      description: "See your design ideas come to life in photorealistic 3D. Experiment with colors, furniture, and layouts in real-time.",
      image: feature1Image,
    },
    {
      icon: <Component className="w-8 h-8 text-primary" />,
      title: "Vast Component Library",
      description: "Access thousands of models from real brands. Drag and drop furniture, lighting, and decor to create your perfect space.",
      image: feature2Image,
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Collaborate with Ease",
      description: "Share your projects with family, designers, or contractors. Get feedback and make decisions together, all in one place.",
      image: feature3Image,
    },
  ];

  const testimonials = [
    {
      name: "Sarah L.",
      title: "Homeowner",
      avatar: avatar1,
      quote: "HomeCanvas transformed my renovation project. Being able to visualize everything before committing saved me so much time and stress. I can't imagine doing it any other way!",
    },
    {
      name: "David Chen",
      title: "Interior Designer",
      avatar: avatar2,
      quote: "The collaboration tools are a game-changer. I can now work with my clients in real-time, making the design process faster and more interactive than ever before.",
    },
    {
      name: "Maria Garcia",
      title: "DIY Enthusiast",
      avatar: avatar3,
      quote: "As someone who loves DIY, HomeCanvas is my new favorite tool. The library is massive, and it's so easy to use. I've designed three rooms already and I'm just getting started!",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid lg:grid-cols-2 gap-12 items-center py-20 md:py-32">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              Design Your Dream Home, <span className="text-primary">Effortlessly</span>.
            </h1>
            <p className="max-w-[600px] text-muted-foreground md:text-xl">
              HomeCanvas is the all-in-one platform for interior design. Visualize, plan, and collaborate on your next project with professional-grade tools that are simple enough for anyone to use.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button size="lg" asChild>
                <Link href="#">
                  Start Designing For Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
          <div className="w-full">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                width={1200}
                height={800}
                className="rounded-xl shadow-2xl aspect-video object-cover"
                data-ai-hint={heroImage.imageHint}
                priority
              />
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-32 bg-card">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                Everything You Need to Design
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg">
                From initial idea to final execution, HomeCanvas provides the tools to make your vision a reality.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="flex flex-col border-none shadow-none bg-transparent">
                  <CardHeader className="p-0">
                    {feature.image && (
                      <Image
                        src={feature.image.imageUrl}
                        alt={feature.image.description}
                        width={600}
                        height={400}
                        className="rounded-lg mb-6 aspect-video object-cover"
                        data-ai-hint={feature.image.imageHint}
                      />
                    )}
                    <div className="flex items-start gap-4">
                      {feature.icon}
                      <CardTitle className="text-xl font-semibold mb-2">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pl-12">
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 md:py-32">
          <div className="container">
            <div className="flex flex-col items-center text-center gap-4 mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                Loved by Homeowners & Professionals
              </h2>
              <p className="max-w-[700px] text-muted-foreground md:text-lg">
                See what our users are saying about their experience with HomeCanvas.
              </p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-0.5 text-primary mb-2">
                      <Star className="w-5 h-5 fill-primary" />
                      <Star className="w-5 h-5 fill-primary" />
                      <Star className="w-5 h-5 fill-primary" />
                      <Star className="w-5 h-5 fill-primary" />
                      <Star className="w-5 h-5 fill-primary" />
                    </div>
                    <blockquote className="text-muted-foreground mb-6">"{testimonial.quote}"</blockquote>
                  </div>
                  <div className="flex items-center gap-4">
                    {testimonial.avatar && (
                      <Avatar>
                        <AvatarImage src={testimonial.avatar.imageUrl} alt={testimonial.name} data-ai-hint={testimonial.avatar.imageHint} />
                        <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
              Ready to Create Your Perfect Space?
            </h2>
            <p className="max-w-[600px] mx-auto mt-4 text-primary-foreground/80 md:text-lg">
              Sign up today and start your first project for free. No credit card required.
            </p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild>
                <Link href="#">
                  Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
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
