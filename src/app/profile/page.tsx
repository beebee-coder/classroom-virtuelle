import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Building, Edit, GraduationCap, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { alumni } from "@/lib/placeholder-data";

export default function ProfilePage() {
  const user = alumni[1]; // Using Jane Smith as the sample logged-in user

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="relative">
        <div className="h-48 w-full rounded-t-lg bg-muted">
           <Image 
            src="https://picsum.photos/seed/profilebg/1200/300" 
            alt="Profile background" 
            className="rounded-t-lg object-cover" 
            layout="fill"
            data-ai-hint="abstract pattern"
           />
        </div>
        <div className="absolute top-24 left-8">
            <Avatar className="h-36 w-36 border-4 border-background">
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.imageHint} />
                <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
        </div>
        <div className="absolute top-4 right-4">
            <Button asChild variant="secondary" size="sm">
                <Link href="/profile/edit">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Link>
            </Button>
        </div>
      </div>

      <Card className="rounded-t-none">
        <CardHeader className="pt-24 pb-4">
          <CardTitle className="text-3xl font-bold">{user.name}</CardTitle>
          <p className="text-muted-foreground">{user.jobTitle} at {user.company}</p>
          <p className="text-sm text-muted-foreground">{user.location}</p>
          <div className="flex gap-2 pt-2">
            <Button size="icon" variant="ghost"><Linkedin className="h-5 w-5 text-muted-foreground" /></Button>
            <Button size="icon" variant="ghost"><Twitter className="h-5 w-5 text-muted-foreground" /></Button>
          </div>
        </CardHeader>
        <CardContent>
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <h3 className="font-headline text-xl font-semibold mb-4">About</h3>
                    <p className="text-muted-foreground">
                        Dynamic and results-oriented Product Manager with a proven track record of driving product strategy and execution. Passionate about building innovative products that solve real-world problems. Graduated in 2018 with a degree in Business Administration.
                    </p>

                    <Separator className="my-6" />

                    <h3 className="font-headline text-xl font-semibold mb-4">Experience</h3>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <Briefcase className="h-8 w-8 text-accent mt-1" />
                            <div>
                                <h4 className="font-semibold">Product Manager</h4>
                                <p className="text-sm text-muted-foreground">Innovate Inc.</p>
                                <p className="text-xs text-muted-foreground">2020 - Present</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Briefcase className="h-8 w-8 text-accent mt-1" />
                            <div>
                                <h4 className="font-semibold">Associate Product Manager</h4>
                                <p className="text-sm text-muted-foreground">Solutions Co.</p>
                                <p className="text-xs text-muted-foreground">2018 - 2020</p>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <h3 className="font-headline text-xl font-semibold mb-4">Education</h3>
                    <div className="flex gap-4">
                         <GraduationCap className="h-8 w-8 text-accent mt-1" />
                        <div>
                            <h4 className="font-semibold">State University</h4>
                            <p className="text-sm text-muted-foreground">Bachelor of Business Administration</p>
                            <p className="text-xs text-muted-foreground">2014 - 2018</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-headline text-xl font-semibold">Contact Info</h3>
                     <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">j.smith@email.com</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground"/>
                        <span className="text-sm">+1 (555) 123-4567</span>
                    </div>
                    <h3 className="font-headline text-xl font-semibold pt-4">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Product Management</Badge>
                        <Badge variant="secondary">Agile Methodologies</Badge>
                        <Badge variant="secondary">User Research</Badge>
                        <Badge variant="secondary">Roadmap Planning</Badge>
                        <Badge variant="secondary">JIRA</Badge>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
