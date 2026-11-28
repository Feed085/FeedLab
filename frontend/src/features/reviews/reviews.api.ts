import { apiClient } from '../../lib/api';

export interface ReviewItem {
  _id: string;
  projectId: string;
  buyerId: any;
  orderId: string;
  rating: number;
  comment: string;
  detailedScores?: Record<string, number>;
  authorReply?: {
    text: string;
    message?: string;
    repliedAt: string;
  };
  isVerifiedPurchase: boolean;
  user?: {
    fullName: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export const reviewsApi = {
  getProjectReviews: async (projectId: string): Promise<{
    data: ReviewItem[];
    reviews: ReviewItem[];
    averageRating: number;
    totalReviews: number;
  }> => {
    const { data } = await apiClient.get(`/reviews/projects/${projectId}`);
    return data;
  },

  createReview: async (reviewData: {
    projectId: string;
    rating: number;
    comment: string;
    detailedScores?: Record<string, number>;
  }): Promise<ReviewItem> => {
    const { data } = await apiClient.post('/reviews', reviewData);
    return data;
  },

  replyReview: async (reviewId: string, response: string): Promise<ReviewItem> => {
    const { data } = await apiClient.post(`/reviews/${reviewId}/reply`, { response });
    return data;
  },
};
