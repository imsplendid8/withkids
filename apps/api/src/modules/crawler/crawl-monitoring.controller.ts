import { Controller, Get, Param, Query, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrawlMonitoringService } from './crawl-monitoring.service';
import { CrawlHistory } from './entities/crawl-history.entity';
import { AdapterState } from './entities/adapter-state.entity';
import { CrawlerService } from '@/crawler/crawler.service';

@ApiTags('Crawler Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/crawler-monitoring')
export class CrawlMonitoringController {
  constructor(
    private crawlMonitoringService: CrawlMonitoringService,
    private crawlerService: CrawlerService,
  ) {}

  @Get('latest')
  @ApiOperation({ summary: '켜져 있는 수집원별 마지막 수집 결과' })
  async getLatest() {
    const enabled = this.crawlerService
      .getAdapters()
      .filter((adapter) => adapter.enabled)
      .map((adapter) => adapter.name);
    return this.crawlMonitoringService.getLatestCrawls(enabled);
  }

  @Get('history/:adapterName')
  @ApiOperation({ summary: 'Get crawl history for an adapter' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCrawlHistory(
    @Param('adapterName') adapterName: string,
    @Query('limit') limit: number = 100,
  ): Promise<CrawlHistory[]> {
    return this.crawlMonitoringService.getCrawlHistory(adapterName, limit);
  }

  @Get('adapter-state/:adapterName')
  @ApiOperation({ summary: 'Get current state of an adapter' })
  async getAdapterState(
    @Param('adapterName') adapterName: string,
  ): Promise<AdapterState | null> {
    return this.crawlMonitoringService.getAdapterState(adapterName);
  }

  @Get('failed-crawls')
  @ApiOperation({ summary: 'Get failed crawls in the last N hours' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getFailedCrawls(@Query('hours') hours: number = 24): Promise<CrawlHistory[]> {
    return this.crawlMonitoringService.getFailedCrawls(hours);
  }

  @Get('unhealthy-adapters')
  @ApiOperation({ summary: 'Get all disabled/unhealthy adapters' })
  async getUnhealthyAdapters(): Promise<AdapterState[]> {
    return this.crawlMonitoringService.getUnhealthyAdapters();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get crawl statistics for the last N hours' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async getRecentCrawlStats(@Query('hours') hours: number = 24): Promise<{
    totalCrawls: number;
    successfulCrawls: number;
    failedCrawls: number;
    averageDuration: number;
    totalProgramsFound: number;
  }> {
    return this.crawlMonitoringService.getRecentCrawlStats(hours);
  }

  @Patch('adapter-state/:adapterName/reset')
  @ApiOperation({ summary: 'Reset adapter state to healthy' })
  async resetAdapterState(
    @Param('adapterName') adapterName: string,
  ): Promise<AdapterState> {
    return this.crawlMonitoringService.resetAdapterState(adapterName);
  }
}
