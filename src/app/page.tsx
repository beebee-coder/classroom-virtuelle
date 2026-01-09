import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase, Calendar, MapPin, Users } from 'lucide-react';
import {
  alumni,
  events,
  testimonials,
} from '@/lib/placeholder-data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero') as ImagePlaceholder;

  return (
    <div className="flex flex-col">
      <section className="relative h-[60vh] min-h-[500px] w-full">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover"
          priority
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 bg-primary/80" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground">
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Welcome to AlumniConnect
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl">
            Reconnect with old friends, build your professional network, and stay engaged with your alma mater.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/directory">
                Find Alumni <Users className="ml-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/events">
                Upcoming Events <Calendar className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="about" className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            A Thriving Community
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
            AlumniConnect is more than just a directory. It's a vibrant platform for professional growth, lifelong learning, and meaningful connections.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center">
              <Users className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-headline text-xl font-semibold">Network</h3>
              <p className="mt-2 text-muted-foreground">
                Expand your professional circle by connecting with alumni in your field and city.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Briefcase className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-headline text-xl font-semibold">Grow</h3>
              <p className="mt-2 text-muted-foreground">
                Discover job opportunities, find mentors, and access career development resources.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Calendar className="h-12 w-12 text-primary" />
              <h3 className="mt-4 font-headline text-xl font-semibold">Engage</h3>
              <p className="mt-2 text-muted-foreground">
                Stay up-to-date with exclusive events, workshops, and reunions.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="featured-alumni" className="bg-card py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
              Meet Our Alumni
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Get inspired by the stories of our successful graduates.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {alumni.slice(0, 3).map((alum) => (
              <Card key={alum.id} className="overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-6 text-center">
                  <Avatar className="mx-auto h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={alum.avatarUrl} alt={alum.name} data-ai-hint={alum.imageHint} />
                    <AvatarFallback>{alum.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 font-headline text-xl font-semibold">{alum.name}</h3>
                  <p className="text-sm text-muted-foreground">Class of {alum.graduationYear}</p>
                  <p className="mt-2 font-medium">{alum.jobTitle}</p>
                  <p className="text-sm text-accent">{alum.company}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button asChild>
              <Link href="/directory">
                View Full Directory <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="events" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
              Upcoming Events
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Don't miss out on our next get-together.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            {events.slice(0, 3).map((event) => (
              <Card key={event.id} className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
                <div className="relative h-48 w-full">
                  <Image
                    src={event.imageUrl}
                    alt={event.title}
                    fill
                    className="object-cover"
                    data-ai-hint={event.imageHint}
                  />
                </div>
                <CardHeader>
                  <CardTitle>{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>{new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    Learn More
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="bg-card py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="font-headline text-center text-3xl font-bold tracking-tight sm:text-4xl">
            What Our Alumni Say
          </h2>
          <Carousel
            opts={{ align: 'start', loop: true }}
            className="mt-12 w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial) => (
                <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="h-full">
                      <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={testimonial.avatarUrl} alt={testimonial.name} data-ai-hint={testimonial.imageHint} />
                          <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="mt-4 flex-grow text-lg italic text-muted-foreground">
                          "{testimonial.testimonial}"
                        </p>
                        <div className="mt-4">
                          <p className="font-headline font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Class of {testimonial.graduationYear}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>
    </div>
  );
}
