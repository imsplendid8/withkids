import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';
import { NotificationType, NotificationPriority } from './entities/notification.entity';

describe('NotificationDeliveryService', () => {
  let service: NotificationDeliveryService;
  let mockNotificationsService: any;
  let mockUsersService: any;

  beforeEach(async () => {
    mockNotificationsService = {
      getUnsendNotifications: jest.fn(),
      markAsSent: jest.fn(),
      getUrgentNotifications: jest.fn(),
    };

    mockUsersService = {
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationDeliveryService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<NotificationDeliveryService>(NotificationDeliveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deliverUnsendNotifications', () => {
    it('should deliver all unsent notifications and mark them as sent', async () => {
      const mockNotifications: any = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Booking Opened',
          message: 'Test message',
          notificationType: NotificationType.BOOKING_OPENED_TODAY,
          priority: NotificationPriority.HIGH,
        },
        {
          id: 'notif-2',
          userId: 'user-2',
          title: 'New Program',
          message: 'Test message 2',
          notificationType: NotificationType.NEW_PROGRAM_DISCOVERED,
          priority: NotificationPriority.MEDIUM,
        },
      ];

      mockNotificationsService.getUnsendNotifications.mockResolvedValue(mockNotifications);
      mockUsersService.getUserById.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });
      mockNotificationsService.markAsSent.mockResolvedValue(undefined);

      const result = await service.deliverUnsendNotifications(100);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(mockNotificationsService.getUnsendNotifications).toHaveBeenCalledWith(100);
    });

    it('should handle delivery errors gracefully', async () => {
      const mockNotifications: any = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Test',
        },
      ];

      mockNotificationsService.getUnsendNotifications.mockResolvedValue(mockNotifications);
      mockUsersService.getUserById.mockRejectedValue(new Error('User not found'));

      const result = await service.deliverUnsendNotifications(100);

      expect(result).toBe(0);
    });
  });

  describe('deliverNotification', () => {
    it('should deliver a single notification', async () => {
      const mockNotification: any = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Booking Opened',
        message: 'Test',
        notificationType: NotificationType.BOOKING_OPENED_TODAY,
      };

      const mockUser: any = {
        id: 'user-1',
        email: 'user@example.com',
      };

      mockUsersService.getUserById.mockResolvedValue(mockUser);

      await service.deliverNotification(mockNotification);

      expect(mockUsersService.getUserById).toHaveBeenCalledWith('user-1');
    });
  });

  describe('sendUrgentNotifications', () => {
    it('should send urgent notifications to user', async () => {
      const mockNotifications: any = [
        {
          id: 'urgent-1',
          userId: 'user-1',
          title: 'Urgent',
          priority: NotificationPriority.CRITICAL,
        },
      ];

      mockNotificationsService.getUrgentNotifications.mockResolvedValue(mockNotifications);
      mockUsersService.getUserById.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });
      mockNotificationsService.markAsSent.mockResolvedValue(undefined);

      const result = await service.sendUrgentNotifications('user-1');

      expect(mockNotificationsService.getUrgentNotifications).toHaveBeenCalledWith('user-1');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
