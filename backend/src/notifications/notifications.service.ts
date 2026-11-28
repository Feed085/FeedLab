import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(
    userId: string | Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    link?: string,
  ): Promise<NotificationDocument> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const notification = new this.notificationModel({
      userId: userObjectId,
      type,
      title,
      message,
      link: link || null,
      isRead: false,
    });
    return notification.save();
  }

  async getUserNotifications(
    userId: string | Types.ObjectId,
    page = 1,
    limit = 50,
  ): Promise<{ data: Notification[]; notifications: Notification[]; unreadCount: number; total: number }> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const [items, unreadCount, total] = await Promise.all([
      this.notificationModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId: userObjectId, isRead: false }),
      this.notificationModel.countDocuments({ userId: userObjectId }),
    ]);

    return {
      data: items,
      notifications: items,
      unreadCount,
      total,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string | Types.ObjectId,
  ): Promise<NotificationDocument> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const notification = await this.notificationModel.findOne({
      _id: Types.ObjectId.isValid(notificationId) ? new Types.ObjectId(notificationId) : null,
      userId: userObjectId,
    });

    if (!notification) {
      throw new NotFoundException('Bildiriş tapılmadı');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    return notification.save();
  }

  async markAllAsRead(
    userId: string | Types.ObjectId,
  ): Promise<{ success: boolean; unreadCount: number }> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    await this.notificationModel.updateMany(
      { userId: userObjectId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    return { success: true, unreadCount: 0 };
  }
}
