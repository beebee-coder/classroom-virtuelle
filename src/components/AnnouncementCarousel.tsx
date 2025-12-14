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
import { Megaphone, Paperclip } from "lucide-react";
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
    return null;
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      opts={{
        align: "start",
        loop: announcements.length > 1,
        dragFree: true,        // ✅ Améliore le défilement tactile
        slidesToScroll: 1,
      }}
      className="w-full relative"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent className="pl-1 pr-1">
        {announcements.map((announcement) => (
          <CarouselItem key={announcement.id} className="pl-1 pr-1">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full flex-shrink-0 mt-0.5">
                    <Megaphone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{announcement.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Par {announcement.author.name ?? 'Admin'} - <FormattedDate date={announcement.createdAt} />
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">{announcement.content}</p>
                {announcement.attachmentUrl && (
                  <a
                    href={announcement.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    aria-label={`Ouvrir la pièce jointe : ${announcement.attachmentUrl}`}
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                    Voir le fichier joint
                  </a>
                )}
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>

      {announcements.length > 1 && (
        <>
          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
        </>
      )}
    </Carousel>
  );
}