import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Experience } from '../../experiences/entities/experience.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('bookings')
@Index(['userId'])
@Index(['experienceId'])
@Index(['status'])
@Index(['createdAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  experienceId: string;

  @ManyToOne(() => Experience, { eager: false })
  @JoinColumn({ name: 'experienceId' })
  experience: Experience;

  @Column({ type: 'date' })
  experienceDate: Date;

  @Column({ type: 'simple-json', nullable: true })
  selectedChildren: Array<{ id: string; name: string; age: number }>;

  @Column({ type: 'text', nullable: true })
  specialRequests: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'PENDING',
  })
  status: BookingStatus;

  @Column({ type: 'int', nullable: true })
  totalPrice: number;

  @Column({ type: 'int', default: 1 })
  numberOfParticipants: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  confirmationNumber: string;

  @OneToMany(() => Review, (review) => review.booking, { cascade: true })
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
