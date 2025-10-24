// src/components/AnnouncementCarousel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Announcement } from '@prisma/client';

type AnnouncementWithAuthor = Announcement & {
    author: { name: string | null };
};

interface AnnouncementDateProps {
  date: string | Date;
}

function FormattedDate({ date }: AnnouncementDateProps) {
  const [formattedDate, setFormattedDate] = useState('Chargement...');

  useEffect(() => {
    try {
      setFormattedDate(format(new Date(date), 'dd MMMM yyyy', { locale: fr }));
    } catch (e) {
      console.error("Date formatting failed", e);
      setFormattedDate("Date invalide");
    }
  }, [date]);

  return <>{formattedDate}</>;
}

interface AnnouncementCarouselProps {
  announcements: AnnouncementWithAuthor[];
}

export function AnnouncementCarousel({ announcements }: AnnouncementCarouselProps) {
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  if (!announcements || announcements.length === 0) {
    return null; // Ne rien afficher si pas d'annonces
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      opts={{
        align: "start",
        loop: announcements.length > 1,
      }}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {announcements.map((announcement) => (
          <CarouselItem key={announcement.id}>
            <div className="p-1">
               <Card>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-full">
                        <Megaphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                         <CardDescription>
                            Par {announcement.author.name ?? 'Admin'} - <FormattedDate date={announcement.createdAt} />
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{announcement.content}</p>
                     {announcement.attachmentUrl && (
                        <a href={announcement.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 inline-block">
                            Voir la pièce jointe
                        </a>
                    )}
                  </CardContent>
                </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {announcements.length > 1 && (
        <>
            <CarouselPrevious className="absolute left-[-20px] top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-[-20px] top-1/2 -translate-y-1/2" />
        </>
      )}
    </Carousel>
  );
}
