import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Since the JSON is empty, we provide an empty array.
// This will be populated as you use placeholder images.
export const PlaceHolderImages: ImagePlaceholder[] = (data as any).placeholderImages || [];
