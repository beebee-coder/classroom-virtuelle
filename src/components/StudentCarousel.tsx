// src/components/StudentCarousel.tsx
'use client';

import * as React from 'react';
import Autoplay from 'embla-carousel-autoplay';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

// Données factices – couleurs valides Tailwind
const dummyStudents = [
  { name: 'Alice', avatarSeed: 'alice' },
  { name: 'Bob', avatarSeed: 'bob' },
  { name: 'Charlie', avatarSeed: 'charlie' },
  { name: 'Diana', avatarSeed: 'diana' },
  { name: 'Ethan', avatarSeed: 'ethan' },
  { name: 'Fiona', avatarSeed: 'fiona' },
];

// ✅ Fonction robuste pour générer l’avatar
const getAvatarUrl = (seed: string) => {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
};

export function StudentCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 2500, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full max-w-xs"
      opts={{
        align: "start",
        loop: true,
      }}
      // ✅ Pause au focus (accessibilité clavier)
      onFocus={() => plugin.current.stop()}
      onBlur={() => plugin.current.reset()}
    >
      <CarouselContent className="-ml-1">
        {dummyStudents.map((student, index) => (
          <CarouselItem key={index} className="pl-1 basis-1/2 sm:basis-1/3 md:basis-1/4">
            <div className="p-1">
              <Card 
                className="overflow-hidden h-full flex flex-col items-center justify-center bg-card hover:bg-accent/30 transition-colors"
                aria-label={`Élève : ${student.name}`}
              >
                <CardContent className="p-3 flex flex-col items-center gap-2">
                  <Avatar className="h-14 w-14 md:h-16 md:w-16 border-2 border-border shadow-sm">
                    <AvatarImage 
                      src={getAvatarUrl(student.avatarSeed)} 
                      alt={`${student.name} avatar`}
                    />
                    <AvatarFallback className="bg-muted text-foreground">
                      {student.name.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm text-center truncate w-full px-1">
                    {student.name}
                  </span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}