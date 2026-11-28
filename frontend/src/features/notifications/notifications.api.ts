import { apiClient } from '../../lib/api';

export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: async (page = 1, limit = 50): Promise<{
    data: NotificationItem[];
    notifications: NotificationItem[];
    unreadCount: number;
    total: number;
  }> => {
    const { data } = await apiClient.get('/notifications', { params: { page, limit } });
    return data;
  },

  markAsRead: async (id: string): Promise<NotificationItem> => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async (): Promise<{ success: boolean; unreadCount: number }> => {
    const { data } = await apiClient.patch('/notifications/read-all');
    return data;
  },
};
