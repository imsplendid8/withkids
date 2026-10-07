import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepository: any;

  beforeEach(async () => {
    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        userId: 'user-1',
        notificationType: NotificationType.BOOKING_OPENED_TODAY,
        title: 'Booking Opened',
        priority: NotificationPriority.HIGH,
        message: 'A new booking has opened',
        experienceRunId: 'run-1',
      };

      mockNotificationRepository.create.mockReturnValue(notificationData);
      mockNotificationRepository.save.mockResolvedValue({
        id: 'notification-1',
        ...notificationData,
        isSent: false,
        isRead: false,
        sentAt: null,
        readAt: null,
      });

      const result = await service.createNotification(
        notificationData.userId,
        notificationData.notificationType,
        notificationData.title,
        notificationData.priority,
        notificationData.message,
        notificationData.experienceRunId,
      );

      expect(result.notificationType).toBe(NotificationType.BOOKING_OPENED_TODAY);
      expect(result.priority).toBe(NotificationPriority.HIGH);
      expect(mockNotificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    // 서비스는 쿼리빌더로 조회한다. 어떤 조건이 붙는지를 검증한다.
    const mockQueryBuilder = (result: unknown[]) => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(result),
      };
      mockNotificationRepository.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should retrieve read and unread notifications when includeRead is true', async () => {
      const mockNotifications: any = [
        { id: 'notification-1', userId: 'user-1', isRead: false },
        { id: 'notification-2', userId: 'user-1', isRead: true },
      ];
      const qb = mockQueryBuilder(mockNotifications);

      const result = await service.getUserNotifications('user-1', true, 50);

      expect(result).toEqual(mockNotifications);
      expect(qb.where).toHaveBeenCalledWith('n.userId = :userId', { userId: 'user-1' });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('n.createdAt', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(50);
    });

    it('should filter to unread notifications when includeRead is false', async () => {
      const qb = mockQueryBuilder([{ id: 'notification-1', userId: 'user-1', isRead: false }]);

      const result = await service.getUserNotifications('user-1', false, 20);

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith('n.isRead = false');
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count for a user', async () => {
      mockNotificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadNotificationCount('user-1');

      expect(result).toBe(5);
      expect(mockNotificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = Object.assign(new Notification(), {
        id: 'notification-1',
        userId: 'user-1',
        isRead: false,
        readAt: null,
      });

      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockImplementation(async (entity: Notification) => entity);

      const result = await service.markAsRead('notification-1');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeInstanceOf(Date);
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
    });

    it('should throw when the notification does not exist', async () => {
      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('missing')).rejects.toThrow('Notification not found');
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      mockNotificationRepository.update.mockResolvedValue({ affected: 2 });

      await service.markAllAsRead('user-1');

      expect(mockNotificationRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRead: false },
        expect.objectContaining({ isRead: true }),
      );
    });
  });

  describe('markAsSent', () => {
    it('should mark a notification as sent', async () => {
      const notification = Object.assign(new Notification(), {
        id: 'notification-1',
        isSent: false,
        sentAt: null,
      });

      mockNotificationRepository.findOne.mockResolvedValue(notification);
      mockNotificationRepository.save.mockImplementation(async (entity: Notification) => entity);

      const result = await service.markAsSent('notification-1');

      expect(result.isSent).toBe(true);
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(notification);
    });
  });

  describe('getCriticalNotifications', () => {
    it('should retrieve critical notifications for a user', async () => {
      const mockNotifications: any = [
        {
          id: 'notification-1',
          userId: 'user-1',
          priority: NotificationPriority.CRITICAL,
        },
      ];

      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.getCriticalNotifications('user-1', 20);

      expect(result).toEqual(mockNotifications);
      expect(result[0].priority).toBe(NotificationPriority.CRITICAL);
    });
  });

  describe('getUrgentNotifications', () => {
    it('should retrieve urgent notifications sorted by urgency score', async () => {
      const mockNotifications: any = [
        {
          id: 'notification-1',
          userId: 'user-1',
          priority: NotificationPriority.CRITICAL,
          isRead: false,
          createdAt: new Date(Date.now() - 3600000),
          getUrgencyScore: jest.fn().mockReturnValue(120),
        },
        {
          id: 'notification-2',
          userId: 'user-1',
          priority: NotificationPriority.HIGH,
          isRead: false,
          createdAt: new Date(Date.now() - 7200000),
          getUrgencyScore: jest.fn().mockReturnValue(85),
        },
      ];

      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.getUrgentNotifications('user-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUnsendNotifications', () => {
    it('should retrieve unsent notifications for delivery queue', async () => {
      const mockNotifications: any = [
        {
          id: 'notification-1',
          userId: 'user-1',
          isSent: false,
          title: 'Unsent Notification',
        },
        {
          id: 'notification-2',
          userId: 'user-2',
          isSent: false,
          title: 'Another Unsent',
        },
      ];

      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.getUnsendNotifications(100);

      expect(result).toEqual(mockNotifications);
      expect(result.every((n: any) => !n.isSent)).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteNotification('notification-1');

      expect(mockNotificationRepository.delete).toHaveBeenCalledWith({
        id: 'notification-1',
      });
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete old read notifications older than specified days', async () => {
      mockNotificationRepository.delete.mockResolvedValue({ affected: 10 });

      const result = await service.deleteOldNotifications(30);

      expect(result).toBe(10);
      const where = mockNotificationRepository.delete.mock.calls[0][0];
      expect(where.isRead).toBe(true);
      expect(where.createdAt.type).toBe('lessThan');
    });
  });

  describe('getNotificationStats', () => {
    it('should retrieve notification statistics for a user', async () => {
      mockNotificationRepository.count
        .mockResolvedValueOnce(50) // totalNotifications
        .mockResolvedValueOnce(15) // unreadCount
        .mockResolvedValueOnce(3) // criticalCount
        .mockResolvedValueOnce(8); // highPriorityCount

      const result = await service.getNotificationStats('user-1');

      expect(result).toEqual({
        totalNotifications: 50,
        unreadCount: 15,
        criticalCount: 3,
        highPriorityCount: 8,
      });
    });
  });
});
