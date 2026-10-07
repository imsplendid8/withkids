import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CrawlStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  PARTIAL_FAILURE = 'PARTIAL_FAILURE',
  FAILURE = 'FAILURE',
}

@Entity('crawl_history')
@Index('idx_crawl_history_adapter', ['adapterName'])
@Index('idx_crawl_history_status', ['status'])
@Index('idx_crawl_history_completed_at', ['crawlCompletedAt'])
export class CrawlHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  adapterName: string;

  @Column({ type: 'timestamp', nullable: false })
  crawlStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  crawlCompletedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  status: CrawlStatus;

  @Column({ type: 'int', default: 0 })
  programsFound: number;

  @Column({ type: 'int', default: 0 })
  programsUpdated: number;

  @Column({ type: 'int', default: 0 })
  programsCreated: number;

  @Column({ type: 'int', default: 0 })
  changesDetected: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  errorStacktrace: string | null;

  @CreateDateColumn()
  createdAt: Date;

  getDuration(): number | null {
    if (!this.crawlCompletedAt) return null;
    return this.crawlCompletedAt.getTime() - this.crawlStartedAt.getTime();
  }

  isSuccess(): boolean {
    return this.status === CrawlStatus.SUCCESS;
  }

  isFailed(): boolean {
    return (
      this.status === CrawlStatus.FAILURE ||
      this.status === CrawlStatus.PARTIAL_FAILURE
    );
  }
}
