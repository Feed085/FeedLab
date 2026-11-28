import { apiClient } from '../../lib/api';

export interface OrderItem {
  _id: string;
  orderNumber: string;
  buyerId: string;
  projectId: any;
  authorId: string;
  price: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_REQUESTED' | 'REFUNDED' | 'CANCELLED';
  paymentMethod: string;
  authorEarnings: number;
  platformFee: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ordersApi = {
  checkout: async (projectId: string, paymentMethod = 'CARD'): Promise<OrderItem> => {
    const { data } = await apiClient.post('/orders/checkout', { projectId, paymentMethod });
    return data;
  },

  claimFree: async (projectId: string): Promise<OrderItem> => {
    const { data } = await apiClient.post(`/orders/claim-free/${projectId}`);
    return data;
  },

  getMyOrders: async (page = 1, limit = 20): Promise<{ data: OrderItem[]; orders: OrderItem[]; total: number }> => {
    const { data } = await apiClient.get('/orders/my', { params: { page, limit } });
    return data;
  },

  getOrderById: async (id: string): Promise<OrderItem> => {
    const { data } = await apiClient.get(`/orders/${id}`);
    return data;
  },

  confirmPayment: async (orderId: string, payload: { transactionId: string; status?: string }) => {
    const { data } = await apiClient.post(`/orders/${orderId}/confirm-payment`, payload);
    return data;
  },

  simulatePayment: async (orderId: string, status = 'SUCCESS') => {
    const { data } = await apiClient.post('/payments/simulate', { orderId, status });
    return data;
  },

  requestRefund: async (orderId: string, reason: string, details?: string) => {
    const { data } = await apiClient.post(`/orders/${orderId}/refund-request`, { reason, details });
    return data;
  },
};
