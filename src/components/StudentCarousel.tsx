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

// Données factices pour la démonstration
const dummyStudents = [
  { name: 'Alice', color: 'bg-red-custom', avatarSeed: 'alice' },
  { name: 'Bob', color: 'bg-blue-500', avatarSeed: 'bob' },
  { name: 'Charlie', color: 'bg-green-500', avatarSeed: 'charlie' },
  { name: 'Diana', color: 'bg-yellow-500', avatarSeed: 'diana' },
  { name: 'Ethan', color: 'bg-purple-500', avatarSeed: 'ethan' },
  { name: 'Fiona', color: 'bg-orange-custom', avatarSeed: 'fiona' },
];

export function StudentCarousel() {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full max-w-xs"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{
        align: "start",
        loop: true,
      }}
    >
      <CarouselContent>
        {dummyStudents.map((student, index) => (
          <CarouselItem key={index} className="p-1">
             <Card className="overflow-hidden w-[200px]">
              <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                <div className={cn(`w-full h-20 flex items-center justify-center rounded-md`, student.color)}>
                  <Avatar className="h-16 w-16 border-4 border-background">
                     <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.avatarSeed}&backgroundColor=transparent`} />
                     <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="font-semibold text-sm">{student.name}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}