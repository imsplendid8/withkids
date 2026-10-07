import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async createNotification(
    userId: string,
    notificationType: NotificationType,
    title: string,
    priority: NotificationPriority,
    message?: string,
    experienceRunId?: string,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      notificationType,
      title,
      priority,
      message,
      experienceRunId,
    });

    return this.notificationsRepository.save(notification);
  }

  async getUserNotifications(
    userId: string,
    includeRead: boolean = false,
    limit: number = 50,
  ): Promise<Notification[]> {
    const query = this.notificationsRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    if (!includeRead) {
      query.andWhere('n.isRead = false');
    }

    return query
      .orderBy('n.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId?: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: userId ? { id: notificationId, userId } : { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.markAsRead();
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAsSent(notificationId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.markAsSent();
    return this.notificationsRepository.save(notification);
  }

  async getUnsendNotifications(limit: number = 100): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { isSent: false },
      order: { priority: 'DESC', createdAt: 'ASC' },
      take: limit,
    });
  }

  async getCriticalNotifications(
    userId: string,
    limit: number = 20,
  ): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: {
        userId,
        priority: NotificationPriority.CRITICAL,
        isRead: false,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUrgentNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId },
      relations: ['experienceRun'],
    });

    return notifications
      .sort((a, b) => b.getUrgencyScore() - a.getUrgencyScore())
      .filter((n) => n.getUrgencyScore() > 50)
      .slice(0, 20);
  }

  async deleteNotification(notificationId: string, userId?: string): Promise<void> {
    await this.notificationsRepository.delete(
      userId ? { id: notificationId, userId } : { id: notificationId },
    );
  }

  async deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.notificationsRepository.delete({
      createdAt: LessThan(cutoffDate),
      isRead: true,
    });

    return result.affected || 0;
  }

  async getNotificationStats(userId: string): Promise<{
    totalNotifications: number;
    unreadCount: number;
    criticalCount: number;
    highPriorityCount: number;
  }> {
    const total = await this.notificationsRepository.count({
      where: { userId },
    });

    const unread = await this.notificationsRepository.count({
      where: { userId, isRead: false },
    });

    const critical = await this.notificationsRepository.count({
      where: { userId, priority: NotificationPriority.CRITICAL },
    });

    const highPriority = await this.notificationsRepository.count({
      where: { userId, priority: NotificationPriority.HIGH },
    });

    return {
      totalNotifications: total,
      unreadCount: unread,
      criticalCount: critical,
      highPriorityCount: highPriority,
    };
  }
}
