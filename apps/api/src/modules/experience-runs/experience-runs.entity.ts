import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Experience } from '../experiences/entities/experience.entity';

@Entity('experience_runs')
@Index(['experienceId'])
@Index(['status'])
@Index(['bookingOpenAt'])
@Index(['experienceDate'])
export class ExperienceRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  experienceId: string;

  @ManyToOne(() => Experience, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'experienceId' })
  experience: Experience;

  @Column({ type: 'int', nullable: true })
  runNumber: number;

  @Column({ type: 'date' })
  experienceDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  bookingOpenAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  bookingCloseAt: Date;

  @Column({
    type: 'varchar',
    length: 50,
  })
  bookingMethod: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @Column({ type: 'int', nullable: true })
  capacityRemaining: number;

  /** 무료는 0, 유료지만 금액을 알 수 없으면 null (서울 오픈API는 유료/무료만 제공) */
  @Column({ type: 'int', nullable: true })
  price: number | null;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'UNKNOWN',
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  automationStatus: string;

  @Column({ type: 'text', nullable: true })
  automationNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalRunId: string;
}
