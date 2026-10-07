import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('experiences')
@Index(['institutionId'])
@Index(['experienceCategory'])
@Index(['isActive'])
export class Experience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  institutionId: string;

  @ManyToOne(() => Institution)
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @Column({ type: 'varchar', length: 255 })
  programName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  programUrl: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  bookingUrl: string;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  experienceCategory: string;

  @Column({ type: 'int', nullable: true })
  targetAgeMin: number;

  @Column({ type: 'int', nullable: true })
  targetAgeMax: number;

  @Column({ type: 'int', nullable: true })
  targetGradeMin: number;

  @Column({ type: 'int', nullable: true })
  targetGradeMax: number;

  @Column({ type: 'boolean', default: false })
  requiredGuardian: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'FIRST_COME',
  })
  bookingMethod: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  discoveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastVerifiedAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  externalSource: string;

  @OneToMany(() => Review, (review) => review.experience, { cascade: true })
  reviews: Review[];
}
