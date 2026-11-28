import { apiClient } from '../../lib/api';

export interface TicketMessage {
  senderId: string;
  senderRole: string;
  senderName?: string;
  message: string;
  createdAt: string;
}

export interface TicketItem {
  _id: string;
  ticketNumber: string;
  userId: any;
  projectId?: any;
  orderId?: any;
  subject: string;
  category: 'TECHNICAL' | 'BILLING' | 'GENERAL' | 'ORDER' | 'REFUND';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'WAITING_FOR_AUTHOR' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  messages: TicketMessage[];
  createdAt: string;
  resolvedAt?: string;
}

export const ticketsApi = {
  createTicket: async (ticketData: {
    subject: string;
    category: string;
    description: string;
    projectId?: string;
    orderId?: string;
    priority?: string;
  }): Promise<TicketItem> => {
    const { data } = await apiClient.post('/tickets', ticketData);
    return data;
  },

  getUserTickets: async (page = 1, limit = 50): Promise<{
    data: TicketItem[];
    tickets: TicketItem[];
    total: number;
  }> => {
    const { data } = await apiClient.get('/tickets', { params: { page, limit } });
    return data;
  },

  getTicketById: async (id: string): Promise<TicketItem> => {
    const { data } = await apiClient.get(`/tickets/${id}`);
    return data;
  },

  sendMessage: async (ticketId: string, message: string) => {
    const { data } = await apiClient.post(`/tickets/${ticketId}/messages`, { message });
    return data;
  },

  updateStatus: async (ticketId: string, status: string): Promise<TicketItem> => {
    const { data } = await apiClient.patch(`/tickets/${ticketId}/status`, { status });
    return data;
  },
};
