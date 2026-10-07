import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExperienceRun } from '@/modules/experience-runs/experience-runs.entity';

export enum ChangeType {
  PROGRAM_CREATED = 'PROGRAM_CREATED',
  PROGRAM_UPDATED = 'PROGRAM_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  BOOKING_OPENED = 'BOOKING_OPENED',
  BOOKING_CLOSED = 'BOOKING_CLOSED',
  BOOKING_TIME_REVEALED = 'BOOKING_TIME_REVEALED',
  CAPACITY_CHANGED = 'CAPACITY_CHANGED',
  PRICE_CHANGED = 'PRICE_CHANGED',
  CANCELLATION_OCCURRED = 'CANCELLATION_OCCURRED',
  PROGRAM_CANCELLED = 'PROGRAM_CANCELLED',
}

export enum ChangeSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity('change_logs')
@Index('idx_change_logs_experience_run', ['experienceRunId'])
@Index('idx_change_logs_change_type', ['changeType'])
@Index('idx_change_logs_severity', ['severity'])
@Index('idx_change_logs_detected_at', ['detectedAt'])
export class ChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  experienceRunId: string;

  @ManyToOne(() => ExperienceRun)
  @JoinColumn({ name: 'experience_run_id' })
  experienceRun: ExperienceRun;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  changeType: ChangeType;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'MEDIUM',
  })
  severity: ChangeSeverity;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changedField: string | null;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  @Column({ type: 'timestamp', nullable: false })
  detectedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
