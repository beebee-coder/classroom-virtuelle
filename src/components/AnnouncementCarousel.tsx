// src/components/AnnouncementCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { AnnouncementWithAuthor } from "@/lib/types";

interface AnnouncementDateProps {
  date: string | Date;
}

function FormattedDate({ date }: AnnouncementDateProps) {
  const [formattedDate, setFormattedDate] = useState('Chargement...');

  useEffect(() => {
    setFormattedDate(format(new Date(date), 'dd MMMM yyyy'));
  }, [date]);

  return <>{formattedDate}</>;
}

interface AnnouncementCarouselProps {
  announcements: AnnouncementWithAuthor[];
}

export function AnnouncementCarousel({ announcements }: AnnouncementCarouselProps) {
  if (!announcements || announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune annonce pour le moment.</p>;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: announcements.length > 1,
      }}
      className="w-full max-w-xl mx-auto"
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
            <CarouselPrevious className="absolute left-[-50px] top-1/2 -translate-y-1/2" />
            <CarouselNext className="absolute right-[-50px] top-1/2 -translate-y-1/2" />
        </>
      )}
    </Carousel>
  );
}
