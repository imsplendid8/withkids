import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';
import { ExperienceRun } from '@/modules/experience-runs/experience-runs.entity';

export enum NotificationType {
  BOOKING_OPENED_TODAY = 'BOOKING_OPENED_TODAY',
  BOOKING_OPENED_TOMORROW = 'BOOKING_OPENED_TOMORROW',
  BOOKING_OPENING_SOON = 'BOOKING_OPENING_SOON',
  NEW_PROGRAM_DISCOVERED = 'NEW_PROGRAM_DISCOVERED',
  CANCELLATION_OCCURRED = 'CANCELLATION_OCCURRED',
  PROGRAM_CANCELLED = 'PROGRAM_CANCELLED',
  PRICE_CHANGED = 'PRICE_CHANGED',
  CAPACITY_CHANGED = 'CAPACITY_CHANGED',
}

export enum NotificationPriority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity('notifications')
@Index('idx_notifications_user', ['userId'])
@Index('idx_notifications_unread', ['userId', 'isRead'])
@Index('idx_notifications_priority', ['priority'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { nullable: true })
  experienceRunId: string | null;

  @ManyToOne(() => ExperienceRun, { nullable: true })
  @JoinColumn({ name: 'experience_run_id' })
  experienceRun: ExperienceRun | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  notificationType: NotificationType;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  priority: NotificationPriority;

  @Column({ type: 'boolean', default: false })
  isSent: boolean;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  markAsSent(): void {
    this.isSent = true;
    this.sentAt = new Date();
  }

  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  getUrgencyScore(): number {
    const priorityScore: Record<NotificationPriority, number> = {
      CRITICAL: 100,
      HIGH: 70,
      MEDIUM: 40,
      LOW: 10,
    };

    let score = priorityScore[this.priority];

    if (!this.isRead) {
      score += 20;
    }

    const ageHours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) {
      score += 30;
    } else if (ageHours < 24) {
      score += 10;
    }

    return Math.min(score, 150);
  }

  isUrgent(): boolean {
    return (
      this.priority === NotificationPriority.CRITICAL ||
      this.priority === NotificationPriority.HIGH
    );
  }
}
