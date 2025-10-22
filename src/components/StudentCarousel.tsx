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
    Autoplay({ delay: 2000, stopOnInteraction: true, playOnInit: true })
  );

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      opts={{
        align: 'start',
        loop: true,
      }}
      orientation="vertical"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.play}
    >
      <CarouselContent className="-mt-1 h-[400px]">
        {dummyStudents.map((student, index) => (
          <CarouselItem key={index} className="pt-1 basis-1/3">
            <div className="p-1">
              <Card className="overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center p-4 gap-2">
                  <div className={`w-full h-20 ${student.color} flex items-center justify-center rounded-md`}>
                    <Avatar className="h-16 w-16 border-4 border-background">
                       <AvatarImage src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${student.avatarSeed}&backgroundColor=transparent`} />
                       <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="font-semibold text-sm">{student.name}</span>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
