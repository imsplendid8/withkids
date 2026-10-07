import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';

export enum ReminderType {
  SEVEN_DAYS_BEFORE = '7_DAYS_BEFORE',
  ONE_DAY_BEFORE = '1_DAY_BEFORE',
  DAY_OF = 'DAY_OF',
}

@Entity('booking_reminders')
@Index(['bookingId'])
@Index(['type'])
@Index(['sentAt'])
export class BookingReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column({
    type: 'varchar',
    length: 50,
  })
  type: ReminderType;

  @Column({ type: 'boolean', default: false })
  sent: boolean;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;
}
