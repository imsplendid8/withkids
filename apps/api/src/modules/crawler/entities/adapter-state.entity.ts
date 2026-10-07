import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('adapter_state')
@Index('idx_adapter_state_name', ['adapterName'], { unique: true })
export class AdapterState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  adapterName: string;

  @Column({ type: 'timestamp', nullable: true })
  lastCrawlAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessfulCrawlAt: Date | null;

  @Column({ type: 'int', default: 0 })
  consecutiveFailures: number;

  @Column({ type: 'boolean', default: false })
  isDisabled: boolean;

  @Column({ type: 'text', nullable: true })
  disableReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  nextScheduledCrawlAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  isHealthy(): boolean {
    return !this.isDisabled && this.consecutiveFailures < 3;
  }

  shouldScheduleCrawl(): boolean {
    if (this.isDisabled) return false;
    if (!this.nextScheduledCrawlAt) return true;
    return new Date() >= this.nextScheduledCrawlAt;
  }

  recordSuccess(): void {
    this.lastCrawlAt = new Date();
    this.lastSuccessfulCrawlAt = new Date();
    this.consecutiveFailures = 0;
  }

  recordFailure(): void {
    this.lastCrawlAt = new Date();
    // 새로 만든 엔티티에는 컬럼 기본값(0)이 아직 없다. undefined++는 NaN이 된다.
    this.consecutiveFailures = (this.consecutiveFailures ?? 0) + 1;

    if (this.consecutiveFailures >= 5) {
      this.isDisabled = true;
      this.disableReason = `Disabled after ${this.consecutiveFailures} consecutive failures`;
    }
  }
}
