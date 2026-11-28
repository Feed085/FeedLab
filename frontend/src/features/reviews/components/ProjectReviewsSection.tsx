import React, { useState, useContext } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  QueryClientContext,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Star,
  CheckCircle2,
  MessageSquare,
  CornerDownRight,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { reviewsApi, ReviewItem } from '../reviews.api';
import { useAuth } from '../../auth/AuthContext';
import { az } from '../../../i18n/az';

interface ProjectReviewsSectionProps {
  projectId: string;
  authorId?: string;
}

const fallbackReviewsQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

export const ProjectReviewsSection: React.FC<ProjectReviewsSectionProps> = (props) => {
  const existingClient = useContext(QueryClientContext);
  if (!existingClient) {
    return (
      <QueryClientProvider client={fallbackReviewsQueryClient}>
        <ProjectReviewsSectionInner {...props} />
      </QueryClientProvider>
    );
  }
  return <ProjectReviewsSectionInner {...props} />;
};

const ProjectReviewsSectionInner: React.FC<ProjectReviewsSectionProps> = ({
  projectId,
  authorId,
}) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAuthorOrAdmin =
    isAuthenticated &&
    user &&
    (user._id === authorId || (user as any).id === authorId || user.role === 'ADMIN');

  // Fetch reviews query
  const { data, isLoading } = useQuery({
    queryKey: ['project-reviews', projectId],
    queryFn: () => reviewsApi.getProjectReviews(projectId),
    enabled: Boolean(projectId),
  });

  const reviews = data?.data || data?.reviews || [];
  const averageRating = data?.averageRating || 0;
  const totalReviews = data?.totalReviews || reviews.length;

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: (newReview: { projectId: string; rating: number; comment: string }) =>
      reviewsApi.createReview(newReview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-reviews', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setShowReviewForm(false);
      setComment('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Rəy göndərilərkən xəta baş verdi.');
    },
  });

  // Reply review mutation
  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      reviewsApi.replyReview(reviewId, reply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-reviews', projectId] });
      setActiveReplyId(null);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Cavab göndərilərkən xəta baş verdi.');
    },
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Bu xana mütləq doldurulmalıdır');
      return;
    }
    createReviewMutation.mutate({
      projectId,
      rating,
      comment: comment.trim(),
    });
  };

  const handleReplySubmit = (reviewId: string) => {
    const text = replyTextMap[reviewId]?.trim();
    if (!text) {
      setErrorMsg('Bu xana mütləq doldurulmalıdır');
      return;
    }
    replyMutation.mutate({ reviewId, reply: text });
  };

  return (
    <section className="space-y-6 pt-6 border-t border-slate-200">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" />
            <span>{az.reviews.sectionTitle}</span>
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-slate-800 text-sm">{averageRating.toFixed(1)}</span>
            <span>•</span>
            <span>{totalReviews} {az.reviews.totalReviews}</span>
          </div>
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              setShowReviewForm(!showReviewForm);
              setErrorMsg(null);
            }}
            className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold rounded-xl text-xs border border-brand-200 transition-colors self-start"
          >
            {az.reviews.writeReview}
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Review Submission Form */}
      {showReviewForm && (
        <form
          onSubmit={handleReviewSubmit}
          className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-150"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{az.reviews.ratingLabel}</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setRating(s)}
                  className="p-1 focus:outline-none"
                  aria-label={`${s} ulduz`}
                >
                  <Star
                    className={`w-6 h-6 transition-colors ${
                      s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{az.reviews.commentLabel}</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={az.reviews.commentPlaceholder}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              İmtina
            </button>
            <button
              type="submit"
              disabled={createReviewMutation.isPending}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {createReviewMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{az.reviews.submitReview}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="py-8 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-1">
          <p className="text-xs font-bold text-slate-700">{az.reviews.noReviews}</p>
          <p className="text-xs text-slate-400">{az.reviews.firstToReview}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev: ReviewItem) => {
            const authorReplyText = rev.authorReply?.text || rev.authorReply?.message;
            const reviewerName = rev.user?.fullName || (typeof rev.buyerId === 'object' ? rev.buyerId?.fullName : 'Təsdiqlənmiş İstifadəçi');

            return (
              <div
                key={rev._id}
                className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3"
              >
                {/* Review Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{reviewerName}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{az.reviews.verifiedBuyerBadge}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rev.createdAt).toLocaleDateString('az-AZ')}
                  </span>
                </div>

                {/* Review Comment */}
                <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                {/* Official Author Reply Box */}
                {authorReplyText && (
                  <div className="mt-3 p-3.5 bg-slate-50 border-l-4 border-brand-500 rounded-r-xl space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>{az.reviews.authorReplyTitle}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pl-5">{authorReplyText}</p>
                  </div>
                )}

                {/* Inline Author Reply Form */}
                {!authorReplyText && isAuthorOrAdmin && (
                  <div className="pt-2">
                    {activeReplyId === rev._id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={replyTextMap[rev._id] || ''}
                          onChange={(e) =>
                            setReplyTextMap({ ...replyTextMap, [rev._id]: e.target.value })
                          }
                          placeholder={az.reviews.replyPlaceholder}
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(rev._id)}
                          disabled={replyMutation.isPending}
                          className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>{az.reviews.submitReply}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          İmtina
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveReplyId(rev._id)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        <CornerDownRight className="w-3 h-3" />
                        <span>{az.reviews.replyAction}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
