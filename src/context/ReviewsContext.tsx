import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ProductQuestion, Review } from '../data/reviews';
import { toast } from '../components/WonPetsAlert';
import { useAuth } from './AuthContext';
import { errorMessage } from '../services/api';
import { reviewsService } from '../services/reviews.service';

type Summary = { average: number; total: number; counts: Record<number, number> };
type Ctx = {
  /** Fetch reviews + questions for a product (call when the tabs open). */
  loadProduct: (productId: string) => Promise<void>;
  loading: (productId: string) => boolean;
  reviewsFor: (productId: string) => Review[];
  summaryFor: (productId: string) => Summary;
  /** You reviewed it but the store has not approved it yet (approved reviews are the only ones listed). */
  hasPendingReview: (productId: string) => boolean;
  /** Resolves true when the review was submitted. */
  saveReview: (productId: string, rating: number, text: string) => Promise<boolean>;
  deleteReview: (id: string, productId: string) => Promise<boolean>;
  questionsFor: (productId: string) => ProductQuestion[];
  askQuestion: (productId: string, text: string) => Promise<boolean>;
  deleteQuestion: (id: string, productId: string) => Promise<boolean>;
};
const ReviewsContext = createContext<Ctx>({} as Ctx);
export const useReviews = () => useContext(ReviewsContext);

export function ReviewsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const meId = user?.id ?? '';
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [questions, setQuestions] = useState<Record<string, ProductQuestion[]>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => { if (!user) { setReviews({}); setQuestions({}); setPending({}); } }, [user]);

  const loadProduct: Ctx['loadProduct'] = useCallback(async (pid) => {
    setBusy((b) => ({ ...b, [pid]: true }));
    try {
      const [r, q] = await Promise.all([reviewsService.reviews(pid, meId), reviewsService.questions(pid, meId)]);
      setReviews((m) => ({ ...m, [pid]: r }));
      setQuestions((m) => ({ ...m, [pid]: q }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy((b) => ({ ...b, [pid]: false }));
    }
  }, [meId]);

  const reviewsFor: Ctx['reviewsFor'] = (pid) => reviews[pid] ?? [];
  const summaryFor: Ctx['summaryFor'] = (pid) => {
    const list = reviews[pid] ?? [];
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    list.forEach((r) => { counts[Math.min(5, Math.max(1, Math.round(r.rating)))] += 1; });
    return { total: list.length, average: list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0, counts };
  };

  const saveReview: Ctx['saveReview'] = async (pid, rating, text) => {
    try {
      await reviewsService.addReview(pid, rating, text.trim());
      setPending((p) => ({ ...p, [pid]: true }));
      return true;
    } catch (e) {
      const msg = errorMessage(e);
      if (/already submitted/i.test(msg)) setPending((p) => ({ ...p, [pid]: true }));
      toast.error(msg);
      return false;
    }
  };
  const deleteReview: Ctx['deleteReview'] = async (id, pid) => {
    try {
      await reviewsService.deleteReview(id);
      setReviews((m) => ({ ...m, [pid]: (m[pid] ?? []).filter((r) => r.id !== id) }));
      setPending((p) => ({ ...p, [pid]: false }));
      return true;
    } catch (e) { toast.error(errorMessage(e)); return false; }
  };

  // The server returns every question; other people's only show once answered, yours always show.
  const questionsFor: Ctx['questionsFor'] = (pid) => (questions[pid] ?? []).filter((q) => q.isMe || q.status === 'Answered');
  const askQuestion: Ctx['askQuestion'] = async (pid, text) => {
    try {
      await reviewsService.ask(pid, text.trim());
      await loadProduct(pid);
      return true;
    } catch (e) { toast.error(errorMessage(e)); return false; }
  };
  const deleteQuestion: Ctx['deleteQuestion'] = async (id, pid) => {
    try {
      await reviewsService.deleteQuestion(id);
      setQuestions((m) => ({ ...m, [pid]: (m[pid] ?? []).filter((q) => q.id !== id) }));
      return true;
    } catch (e) { toast.error(errorMessage(e)); return false; }
  };

  return (
    <ReviewsContext.Provider value={{ loadProduct, loading: (pid) => !!busy[pid], reviewsFor, summaryFor, hasPendingReview: (pid) => !!pending[pid], saveReview, deleteReview, questionsFor, askQuestion, deleteQuestion }}>
      {children}
    </ReviewsContext.Provider>
  );
}
