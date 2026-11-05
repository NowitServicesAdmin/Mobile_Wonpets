import { api } from './api';
import { mapQuestion, mapReview } from './mappers';
import type { ProductQuestion, Review } from '../data/reviews';

export const reviewsService = {
  async reviews(productId: string, meId: string): Promise<Review[]> {
    const { data } = await api.get(`/reviews/product/${productId}`);
    return (data.reviews || []).map((r: any) => mapReview(r, meId));
  },
  /** Needs a delivered order for this product. New reviews wait for the store's approval. */
  async addReview(productId: string, rating: number, review: string) {
    await api.post('/reviews', { productId, rating, review });
  },
  async deleteReview(id: string) {
    await api.delete(`/reviews/${id}`);
  },
  async questions(productId: string, meId: string): Promise<ProductQuestion[]> {
    const { data } = await api.get(`/questions/product/${productId}`);
    return (data.questions || []).map((q: any) => mapQuestion(q, meId));
  },
  async ask(productId: string, question: string) {
    await api.post('/questions', { productId, question });
  },
  async deleteQuestion(id: string) {
    await api.delete(`/questions/${id}`);
  },
};
