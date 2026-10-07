import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('crawler') private crawlerQueue: Queue,
    @InjectQueue('notification-delivery')
    private notificationDeliveryQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing job schedules...');

    await this.initializeCrawlerSchedule();
    await this.initializeNotificationDeliverySchedule();
  }

  private async initializeCrawlerSchedule() {
    try {
      await this.crawlerQueue.removeRepeatable('run-crawlers', {
        cron: '0 */6 * * *',
      });
    } catch (error) {
      this.logger.warn('No existing crawler schedule to remove');
    }

    await this.crawlerQueue.add(
      'run-crawlers',
      {},
      {
        repeat: {
          cron: '0 */6 * * *',
        },
        removeOnComplete: {
          age: 3600,
        },
        removeOnFail: {
          age: 86400,
        },
      },
    );

    this.logger.log('Crawler schedule initialized: every 6 hours at minute 0');
  }

  private async initializeNotificationDeliverySchedule() {
    try {
      await this.notificationDeliveryQueue.removeRepeatable('deliver-unsent', {
        cron: '0 * * * *',
      });
      await this.notificationDeliveryQueue.removeRepeatable('deliver-urgent', {
        cron: '*/15 * * * *',
      });
      await this.notificationDeliveryQueue.removeRepeatable(
        'cleanup-old-notifications',
        {
          cron: '0 2 * * 0',
        },
      );
    } catch (error) {
      this.logger.warn(
        'No existing notification delivery schedules to remove',
      );
    }

    await this.notificationDeliveryQueue.add(
      'deliver-unsent',
      {},
      {
        repeat: {
          cron: '0 * * * *',
        },
        removeOnComplete: {
          age: 3600,
        },
        removeOnFail: {
          age: 86400,
        },
      },
    );

    await this.notificationDeliveryQueue.add(
      'deliver-urgent',
      {},
      {
        repeat: {
          cron: '*/15 * * * *',
        },
        removeOnComplete: {
          age: 1800,
        },
        removeOnFail: {
          age: 3600,
        },
      },
    );

    await this.notificationDeliveryQueue.add(
      'cleanup-old-notifications',
      {},
      {
        repeat: {
          cron: '0 2 * * 0',
        },
        removeOnComplete: {
          age: 604800,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    );

    this.logger.log(
      'Notification delivery schedules initialized: deliver-unsent (hourly), deliver-urgent (every 15 minutes), cleanup (weekly)',
    );
  }

  async getCrawlerJobStats() {
    const counts = await this.crawlerQueue.getJobCounts();
    const repeatableJobs = await this.crawlerQueue.getRepeatableJobs();
    const failed = await this.crawlerQueue.getFailed(0, 10);
    const completed = await this.crawlerQueue.getCompleted(0, 10);

    return {
      queue: 'crawler',
      counts,
      repeatableJobs: repeatableJobs.map((job) => ({
        name: job.name,
        cron: job.cron,
      })),
      recentFailed: failed,
      recentCompleted: completed,
    };
  }

  async getNotificationDeliveryJobStats() {
    const counts = await this.notificationDeliveryQueue.getJobCounts();
    const repeatableJobs =
      await this.notificationDeliveryQueue.getRepeatableJobs();
    const failed = await this.notificationDeliveryQueue.getFailed(0, 10);
    const completed = await this.notificationDeliveryQueue.getCompleted(0, 10);

    return {
      queue: 'notification-delivery',
      counts,
      repeatableJobs: repeatableJobs.map((job) => ({
        name: job.name,
        cron: job.cron,
      })),
      recentFailed: failed,
      recentCompleted: completed,
    };
  }

  async triggerCrawlerJob() {
    const job = await this.crawlerQueue.add(
      'run-crawlers',
      {},
      {
        priority: 1,
      },
    );
    return job;
  }

  async triggerNotificationDeliveryJob() {
    const job = await this.notificationDeliveryQueue.add(
      'deliver-unsent',
      {},
      {
        priority: 1,
      },
    );
    return job;
  }

  getQueues(): Queue[] {
    return [this.crawlerQueue, this.notificationDeliveryQueue];
  }
}
