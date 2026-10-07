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
import { Experience } from '@/modules/experiences/entities/experience.entity';

export enum PatternType {
  FIXED_DAY_OF_MONTH = 'FIXED_DAY_OF_MONTH',
  RELATIVE_DAY_OF_MONTH = 'RELATIVE_DAY_OF_MONTH',
  FIXED_WEEKDAY = 'FIXED_WEEKDAY',
  RELATIVE_TO_EXPERIENCE = 'RELATIVE_TO_EXPERIENCE',
  SEASONAL = 'SEASONAL',
  IRREGULAR = 'IRREGULAR',
}

@Entity('booking_patterns')
@Index('idx_booking_patterns_experience', ['experienceId'])
@Index('idx_booking_patterns_confidence', ['confidence'])
export class BookingPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  experienceId: string;

  @ManyToOne(() => Experience)
  @JoinColumn({ name: 'experience_id' })
  experience: Experience;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  patternType: PatternType;

  @Column({ type: 'varchar', length: 500, nullable: false })
  patternRule: string;

  @Column({ type: 'time', nullable: true })
  timeOfDay: string | null;

  @Column({ type: 'float', default: 0.5 })
  confidence: number;

  @Column({ type: 'int', default: 0 })
  evidenceCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
