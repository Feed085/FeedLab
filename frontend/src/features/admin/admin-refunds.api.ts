import { apiClient } from '../../lib/api';

export interface RefundItem {
  _id: string;
  orderId: any;
  buyerId: any;
  projectId?: any;
  reason: string;
  details?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  refundAmount: number;
  currency: string;
  adminNotes?: string;
  createdAt: string;
}

export const adminRefundsApi = {
  getAdminRefunds: async (status?: string, page = 1, limit = 20): Promise<{
    refunds: RefundItem[];
    data: RefundItem[];
    total: number;
  }> => {
    const { data } = await apiClient.get('/admin/refunds', { params: { status, page, limit } });
    return data;
  },

  decideRefund: async (refundId: string, action: 'APPROVE' | 'REJECT', adminNotes?: string) => {
    const { data } = await apiClient.post(`/admin/refunds/${refundId}/decision`, { action, adminNotes });
    return data;
  },
};
