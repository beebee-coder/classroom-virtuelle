import type { Alumni, Event, Testimonial } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find((img) => img.id === id);
  if (!image) {
    // Return a default or empty object if not found
    return { imageUrl: 'https://picsum.photos/seed/default/400/400', imageHint: 'placeholder' };
  }
  return { imageUrl: image.imageUrl, imageHint: image.imageHint };
}

export const alumni: Alumni[] = [
  { id: '1', name: 'John Doe', avatarUrl: getImage('alumni1').imageUrl, imageHint: getImage('alumni1').imageHint, graduationYear: 2015, major: 'Computer Science', jobTitle: 'Software Engineer', company: 'Tech Corp', location: 'San Francisco, CA' },
  { id: '2', name: 'Jane Smith', avatarUrl: getImage('alumni2').imageUrl, imageHint: getImage('alumni2').imageHint, graduationYear: 2018, major: 'Business Administration', jobTitle: 'Product Manager', company: 'Innovate Inc.', location: 'New York, NY' },
  { id: '3', name: 'Peter Jones', avatarUrl: getImage('alumni3').imageUrl, imageHint: getImage('alumni3').imageHint, graduationYear: 2012, major: 'Marketing', jobTitle: 'Marketing Director', company: 'Connectify', location: 'Chicago, IL' },
  { id: '4', name: 'Mary Johnson', avatarUrl: getImage('alumni4').imageUrl, imageHint: getImage('alumni4').imageHint, graduationYear: 2020, major: 'Graphic Design', jobTitle: 'UI/UX Designer', company: 'Creative Solutions', location: 'Austin, TX' },
  { id: '5', name: 'David Williams', avatarUrl: getImage('alumni5').imageUrl, imageHint: getImage('alumni5').imageHint, graduationYear: 2016, major: 'Mechanical Engineering', jobTitle: 'Lead Engineer', company: 'Future Mechanics', location: 'Boston, MA' },
  { id: '6', name: 'Sarah Brown', avatarUrl: getImage('alumni6').imageUrl, imageHint: getImage('alumni6').imageHint, graduationYear: 2019, major: 'Biology', jobTitle: 'Research Scientist', company: 'BioGen', location: 'San Diego, CA' },
];

export const events: Event[] = [
  { id: '1', title: 'Annual Alumni Gala', date: '2024-12-15T19:00:00', location: 'Grand Ballroom, Downtown', description: 'Join us for a night of celebration and networking at our biggest event of the year.', imageUrl: getImage('event1').imageUrl, imageHint: getImage('event1').imageHint },
  { id: '2', title: 'Tech Innovators Conference', date: '2024-11-22T09:00:00', location: 'Convention Center', description: 'A full-day conference featuring talks from leading alumni in the tech industry.', imageUrl: getImage('event2').imageUrl, imageHint: getImage('event2').imageHint },
  { id: '3', title: 'Career Development Workshop', date: '2024-10-30T14:00:00', location: 'Online', description: 'A virtual workshop focused on resume building, interview skills, and career transitions.', imageUrl: getImage('event3').imageUrl, imageHint: getImage('event3').imageHint },
];

export const testimonials: Testimonial[] = [
  { id: '1', name: 'Jane Smith', avatarUrl: getImage('alumni2').imageUrl, imageHint: getImage('alumni2').imageHint, graduationYear: 2018, testimonial: 'AlumniConnect helped me find my co-founder for my startup. The network here is incredibly valuable!' },
  { id: '2', name: 'David Williams', avatarUrl: getImage('alumni5').imageUrl, imageHint: getImage('alumni5').imageHint, graduationYear: 2016, testimonial: "The events are fantastic. I've reconnected with so many old friends and made great professional contacts." },
  { id: '3', name: 'Sarah Brown', avatarUrl: getImage('alumni6').imageUrl, imageHint: getImage('alumni6').imageHint, graduationYear: 2019, testimonial: 'As a recent grad, the mentorship opportunities I found on this platform have been a game-changer for my career.' },
];
