import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ExperienceRun } from '@/modules/experience-runs/experience-runs.entity';

export enum BookmarkType {
  WISHLIST = 'WISHLIST',
  INTERESTED = 'INTERESTED',
  COMPLETED = 'COMPLETED',
  BOOKED = 'BOOKED',
}

@Entity('user_bookmarks')
@Index('idx_user_bookmarks_user', ['userId'])
@Index('idx_user_bookmarks_run', ['experienceRunId'])
@Index('idx_user_bookmarks_type', ['bookmarkType'])
export class UserBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  experienceRunId: string;

  @ManyToOne(() => ExperienceRun)
  @JoinColumn({ name: 'experience_run_id' })
  experienceRun: ExperienceRun;

  @Column({
    type: 'varchar',
    length: 50,
  })
  bookmarkType: BookmarkType;

  @Column({ type: 'timestamp', nullable: true })
  bookedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalBookingId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isBooked(): boolean {
    return this.bookmarkType === BookmarkType.BOOKED && this.bookedAt !== null;
  }

  markAsCompleted(): void {
    this.bookmarkType = BookmarkType.COMPLETED;
  }

  markAsBooked(externalId?: string): void {
    this.bookmarkType = BookmarkType.BOOKED;
    this.bookedAt = new Date();
    if (externalId) {
      this.externalBookingId = externalId;
    }
  }
}
