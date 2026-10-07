import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { UsersService } from '../users/users.service';

export interface NotificationTemplate {
  subject: string;
  body: string;
  html: string;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  async deliverUnsendNotifications(limit: number = 100): Promise<number> {
    const notifications = await this.notificationsService.getUnsendNotifications(limit);
    let deliveredCount = 0;

    for (const notification of notifications) {
      try {
        await this.deliverNotification(notification);
        await this.notificationsService.markAsSent(notification.id);
        deliveredCount++;
        this.logger.log(`✅ Delivered notification ${notification.id}`);
      } catch (error) {
        this.logger.error(`❌ Failed to deliver notification ${notification.id}:`, error);
      }
    }

    return deliveredCount;
  }

  async deliverNotification(notification: Notification): Promise<void> {
    const user = await this.usersService.getUserById(notification.userId);
    if (!user) {
      throw new Error(`User not found: ${notification.userId}`);
    }

    const template = this.getNotificationTemplate(notification);

    try {
      await this.sendEmail(user.email, template);
    } catch (error) {
      this.logger.error(`Failed to send email to ${user.email}:`, error);
      throw error;
    }
  }

  async sendBulkNotifications(notifications: Notification[]): Promise<number> {
    let successCount = 0;

    for (const notification of notifications) {
      try {
        await this.deliverNotification(notification);
        await this.notificationsService.markAsSent(notification.id);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to send bulk notification ${notification.id}:`, error);
      }
    }

    return successCount;
  }

  async sendUrgentNotifications(userId: string): Promise<number> {
    const notifications = await this.notificationsService.getUrgentNotifications(userId);
    return this.sendBulkNotifications(notifications);
  }

  private getNotificationTemplate(notification: Notification): NotificationTemplate {
    const templates: Record<NotificationType, (n: Notification) => NotificationTemplate> = {
      [NotificationType.BOOKING_OPENED_TODAY]: this.bookingOpenedTodayTemplate,
      [NotificationType.BOOKING_OPENED_TOMORROW]: this.bookingOpenedTomorrowTemplate,
      [NotificationType.BOOKING_OPENING_SOON]: this.bookingOpeningSoonTemplate,
      [NotificationType.NEW_PROGRAM_DISCOVERED]: this.newProgramDiscoveredTemplate,
      [NotificationType.CANCELLATION_OCCURRED]: this.cancellationOccurredTemplate,
      [NotificationType.PROGRAM_CANCELLED]: this.programCancelledTemplate,
      [NotificationType.PRICE_CHANGED]: this.priceChangedTemplate,
      [NotificationType.CAPACITY_CHANGED]: this.capacityChangedTemplate,
    };

    const templateFn = templates[notification.notificationType];
    if (!templateFn) {
      return this.defaultTemplate(notification);
    }

    return templateFn.call(this, notification);
  }

  private bookingOpenedTodayTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `🎉 예약이 시작되었습니다! - ${notification.title}`,
      body: `안녕하세요! 관심 있던 프로그램 '${notification.title}'의 예약이 오늘부터 시작되었습니다. 지금 바로 예약하세요!`,
      html: `
        <h2>${notification.title}</h2>
        <p>관심 있던 프로그램의 예약이 오늘부터 시작되었습니다!</p>
        <p>${notification.message || ''}</p>
        <a href="https://example.com/programs">예약하러 가기</a>
      `,
    };
  }

  private bookingOpenedTomorrowTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `📢 내일 예약이 시작됩니다! - ${notification.title}`,
      body: `관심 있던 프로그램 '${notification.title}'의 예약이 내일부터 시작됩니다. 미리 준비하세요!`,
      html: `
        <h2>${notification.title}</h2>
        <p>내일부터 예약이 시작됩니다!</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private bookingOpeningSoonTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `⏰ 곧 예약이 시작됩니다! - ${notification.title}`,
      body: `프로그램 '${notification.title}'의 예약이 곧 시작됩니다. 알람을 설정하세요!`,
      html: `
        <h2>${notification.title}</h2>
        <p>곧 예약이 시작될 예정입니다!</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private newProgramDiscoveredTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `✨ 새로운 프로그램이 추가되었습니다! - ${notification.title}`,
      body: `당신의 관심사와 맞는 새로운 프로그램 '${notification.title}'이 추가되었습니다!`,
      html: `
        <h2>${notification.title}</h2>
        <p>새로운 프로그램이 추가되었습니다!</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private cancellationOccurredTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `⚠️ 프로그램 일정이 변경되었습니다 - ${notification.title}`,
      body: `예약하신 프로그램 '${notification.title}'의 일정이 변경되었습니다. 확인하세요!`,
      html: `
        <h2>${notification.title}</h2>
        <p>프로그램 일정이 변경되었습니다.</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private programCancelledTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `❌ 프로그램이 취소되었습니다 - ${notification.title}`,
      body: `예약하신 프로그램 '${notification.title}'이 취소되었습니다. 자세히 확인하세요.`,
      html: `
        <h2>${notification.title}</h2>
        <p>프로그램이 취소되었습니다.</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private priceChangedTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `💰 프로그램 가격이 변경되었습니다 - ${notification.title}`,
      body: `프로그램 '${notification.title}'의 가격이 변경되었습니다.`,
      html: `
        <h2>${notification.title}</h2>
        <p>프로그램 가격이 변경되었습니다.</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private capacityChangedTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: `👥 프로그램 정원이 변경되었습니다 - ${notification.title}`,
      body: `프로그램 '${notification.title}'의 정원이 변경되었습니다.`,
      html: `
        <h2>${notification.title}</h2>
        <p>프로그램 정원이 변경되었습니다.</p>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private defaultTemplate(notification: Notification): NotificationTemplate {
    return {
      subject: notification.title,
      body: notification.message || notification.title,
      html: `
        <h2>${notification.title}</h2>
        <p>${notification.message || ''}</p>
      `,
    };
  }

  private async sendEmail(email: string, template: NotificationTemplate): Promise<void> {
    // TODO: Implement actual email sending using nodemailer or AWS SES
    // For now, this is a placeholder that logs the email
    this.logger.log(`📧 Email queued for ${email}: ${template.subject}`);
    // In production, integrate with email service:
    // await this.emailService.send({
    //   to: email,
    //   subject: template.subject,
    //   html: template.html,
    // });
  }
}
