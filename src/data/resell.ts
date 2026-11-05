// Resell constants + types. Listings come from the API (see services/resell.service.ts and context/ResellContext.tsx).
export const PET_CATEGORIES = ['Dog', 'Cat', 'Bird', 'Aquatic Pet', 'Small Pet', 'Reptile'];
export const PRODUCT_CATEGORIES = ['Food', 'Accessories', 'Toys', 'Medicine', 'Health', 'Grooming', 'Beds', 'Cages', 'Clothing', 'Others'];
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'] as const;
export const AGE_OPTIONS = ['0-3 Months', '3-6 Months', '6-12 Months', '1-2 Years', '2-5 Years', '5+ Years'];
export const BREED_SUGGESTIONS: Record<string, string[]> = {
  Dog: ['Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'Beagle', 'Pug', 'Shih Tzu', 'Indian Pariah'],
  Cat: ['Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Indian Billi', 'Bengal'],
  Bird: ['Budgerigar', 'Cockatiel', 'African Grey', 'Lovebird', 'Canary'],
  'Aquatic Pet': ['Goldfish', 'Betta', 'Guppy', 'Angelfish', 'Koi'],
  'Small Pet': ['Rabbit', 'Hamster', 'Guinea Pig', 'Ferret'],
  Reptile: ['Turtle', 'Iguana', 'Gecko', 'Bearded Dragon', 'Ball Python'],
};
export const CATEGORY_EMOJI: Record<string, string> = {
  Dog: '🐕', Cat: '🐈', Bird: '🦜', 'Aquatic Pet': '🐠', 'Small Pet': '🐇', Reptile: '🦎',
  Food: '🍖', Accessories: '🎀', Toys: '🧸', Medicine: '💊', Health: '🩺', Grooming: '✂️', Beds: '🛏️', Cages: '🏠', Clothing: '👕', Others: '📦',
};
export const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Most Viewed'] as const;
export const TABS = ['All', 'Pets', 'Accessories', 'Beds', 'Grooming', 'More'] as const;

export type Condition = (typeof CONDITIONS)[number];
export type Listing = {
  id: string; listingType: 'Pet' | 'Product'; title: string; category: string; breed?: string; age?: string; gender?: 'Male' | 'Female'; brand?: string;
  condition: Condition; price: number; originalPrice?: number; quantity: number; location: string; description: string;
  emoji: string; photos: string[]; sellerId: string; status: 'Available' | 'Sold' | 'Reserved'; isActive: boolean; isFeatured: boolean;
  views: number; favouritesCount: number; createdAt: string;
  /** Set by the API mapper. `sellerId` is "me" for your own listings; `sellerUserId` is always the real user id. */
  customCategory?: string; sellerUserId?: string; seller?: Seller;
};
export type Seller = { id?: string; name: string; emoji: string; image?: string; phone: string; since: string; verified?: boolean; listingsCount?: number; soldCount?: number };
export const timeAgo = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};
