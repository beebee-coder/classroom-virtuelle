export type Alumni = {
  id: string;
  name: string;
  avatarUrl: string;
  imageHint: string;
  graduationYear: number;
  major: string;
  jobTitle: string;
  company: string;
  location: string;
};

export type Event = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export type Testimonial = {
  id: string;
  name: string;
  avatarUrl: string;
  imageHint: string;
  graduationYear: number;
  testimonial: string;
};
