'use client';

import { useState } from 'react';
import { Briefcase, MapPin, Search } from 'lucide-react';
import { alumni as allAlumni } from '@/lib/placeholder-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlumni = allAlumni.filter(
    (alum) =>
      alum.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alum.major.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alum.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alum.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
          Alumni Directory
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Search for fellow alumni by name, major, company, or job title.
        </p>
      </div>

      <div className="relative mx-auto mt-8 max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search alumni..."
          className="w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredAlumni.map((alum) => (
          <Card key={alum.id} className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-primary/10">
                <AvatarImage src={alum.avatarUrl} alt={alum.name} data-ai-hint={alum.imageHint} />
                <AvatarFallback>{alum.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </CardHeader>
            <CardContent className="flex-grow text-center">
              <CardTitle className="text-lg">{alum.name}</CardTitle>
              <CardDescription>Class of {alum.graduationYear}</CardDescription>
              <div className="mt-4 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className="h-4 w-4 text-accent" />
                  <span>{alum.jobTitle} at {alum.company}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span>{alum.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filteredAlumni.length === 0 && (
        <div className="text-center mt-16 text-muted-foreground">
          <p className="text-lg">No alumni found.</p>
          <p>Try adjusting your search term.</p>
        </div>
      )}
    </div>
  );
}
