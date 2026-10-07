import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';

// 쿼리 문자열 'false'는 truthy이므로 명시적으로 변환한다.
function parseBool(value: unknown): boolean {
  return value === true || value === 'true';
}

// 경로의 :userId는 로그인한 본인만 다룰 수 있다.
function assertSelf(current: JwtPayload, userId: string): void {
  if (current.sub !== userId) {
    throw new ForbiddenException('You can only access your own notifications');
  }
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  async createNotification(
    @Body()
    body: {
      userId: string;
      notificationType: NotificationType;
      title: string;
      priority: NotificationPriority;
      message?: string;
      experienceRunId?: string;
    },
  ): Promise<Notification> {
    return this.notificationsService.createNotification(
      body.userId,
      body.notificationType,
      body.title,
      body.priority,
      body.message,
      body.experienceRunId,
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get notifications for the current user' })
  @ApiQuery({ name: 'includeRead', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('includeRead') includeRead: boolean = false,
    @Query('limit') limit: number = 50,
  ): Promise<Notification[]> {
    return this.notificationsService.getUserNotifications(
      user.sub,
      parseBool(includeRead),
      limit,
    );
  }

  @Patch('read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  async markAllMineAsRead(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Patch(':notificationId/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark one of the current user notifications as read' })
  async markMineAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(notificationId, user.sub);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiQuery({ name: 'includeRead', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserNotifications(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Query('includeRead') includeRead: boolean = false,
    @Query('limit') limit: number = 50,
  ): Promise<Notification[]> {
    assertSelf(user, userId);
    return this.notificationsService.getUserNotifications(
      userId,
      parseBool(includeRead),
      limit,
    );
  }

  @Get('user/:userId/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for a user' })
  async getUnreadCount(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    assertSelf(user, userId);
    const count = await this.notificationsService.getUnreadNotificationCount(
      userId,
    );
    return { count };
  }

  @Get('user/:userId/critical')
  @ApiOperation({ summary: 'Get critical notifications for a user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCriticalNotifications(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
  ): Promise<Notification[]> {
    assertSelf(user, userId);
    return this.notificationsService.getCriticalNotifications(userId, limit);
  }

  @Get('user/:userId/urgent')
  @ApiOperation({ summary: 'Get urgent notifications by score' })
  async getUrgentNotifications(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<Notification[]> {
    assertSelf(user, userId);
    return this.notificationsService.getUrgentNotifications(userId);
  }

  @Get('unsent')
  @ApiOperation({ summary: 'Get all unsent notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUnsendNotifications(
    @Query('limit') limit: number = 100,
  ): Promise<Notification[]> {
    return this.notificationsService.getUnsendNotifications(limit);
  }

  @Get('user/:userId/stats')
  @ApiOperation({ summary: 'Get notification statistics for a user' })
  async getNotificationStats(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<{
    totalNotifications: number;
    unreadCount: number;
    criticalCount: number;
    highPriorityCount: number;
  }> {
    assertSelf(user, userId);
    return this.notificationsService.getNotificationStats(userId);
  }

  @Put(':notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(notificationId, user.sub);
  }

  @Put(':notificationId/sent')
  @ApiOperation({ summary: 'Mark notification as sent' })
  async markAsSent(
    @Param('notificationId') notificationId: string,
  ): Promise<Notification> {
    return this.notificationsService.markAsSent(notificationId);
  }

  @Put('user/:userId/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ): Promise<void> {
    assertSelf(user, userId);
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':notificationId')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<void> {
    return this.notificationsService.deleteNotification(notificationId, user.sub);
  }

  @Delete('cleanup/old')
  @ApiOperation({ summary: 'Delete old read notifications' })
  @ApiQuery({ name: 'olderThanDays', required: false, type: Number })
  async deleteOldNotifications(
    @Query('olderThanDays') olderThanDays: number = 30,
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.notificationsService.deleteOldNotifications(
      olderThanDays,
    );
    return { deletedCount };
  }
}
