import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/jobs')
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get('crawler/stats')
  @ApiOperation({ summary: 'Get crawler job queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Crawler job queue stats including job counts and recent jobs',
  })
  async getCrawlerStats() {
    return this.jobsService.getCrawlerJobStats();
  }

  @Get('notification-delivery/stats')
  @ApiOperation({ summary: 'Get notification delivery job queue statistics' })
  @ApiResponse({
    status: 200,
    description:
      'Notification delivery job queue stats including job counts and recent jobs',
  })
  async getNotificationDeliveryStats() {
    return this.jobsService.getNotificationDeliveryJobStats();
  }

  @Post('crawler/trigger')
  @ApiOperation({ summary: 'Manually trigger crawler job' })
  @ApiResponse({
    status: 200,
    description: 'Crawler job triggered successfully',
  })
  async triggerCrawlerJob() {
    const job = await this.jobsService.triggerCrawlerJob();
    return {
      success: true,
      jobId: job.id,
      message: 'Crawler job triggered successfully',
    };
  }

  @Post('notification-delivery/trigger')
  @ApiOperation({ summary: 'Manually trigger notification delivery job' })
  @ApiResponse({
    status: 200,
    description: 'Notification delivery job triggered successfully',
  })
  async triggerNotificationDeliveryJob() {
    const job = await this.jobsService.triggerNotificationDeliveryJob();
    return {
      success: true,
      jobId: job.id,
      message: 'Notification delivery job triggered successfully',
    };
  }
}
