// Review / question types + helpers. Data comes from the API (see services/reviews.service.ts and context/ReviewsContext.tsx).
export type Review = { id: string; productId: string; author: string; emoji: string; isMe?: boolean; rating: number; review: string; createdAt: string };
export type ProductQuestion = { id: string; productId: string; author: string; emoji: string; isMe?: boolean; question: string; status: 'Answered' | 'Pending'; answer?: { text: string; by: string; at: string }; createdAt: string };

export const RATING_LABELS: Record<number, string> = { 0.5: 'Useless', 1: 'Very Poor', 1.5: 'Poor', 2: 'Fair', 2.5: 'Average', 3: 'Good', 3.5: 'Very Good', 4: 'Great', 4.5: 'Excellent', 5: 'Outstanding' };

export const relTime = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d} day${d > 1 ? 's' : ''} ago` : `${Math.floor(d / 30)} month${d >= 60 ? 's' : ''} ago`;
};
