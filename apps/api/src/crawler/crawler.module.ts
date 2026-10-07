import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerService } from './crawler.service';
import { CrawlMonitoringService } from '@/modules/crawler/crawl-monitoring.service';
import { CrawlMonitoringController } from '@/modules/crawler/crawl-monitoring.controller';
import { DataLoaderAdapter } from './adapters/data-loader.adapter';
import { SeoulPublicServiceAdapter } from './adapters/seoul-public-service.adapter';
import { MuseumAdapter } from './adapters/museum.adapter';
import { ScienceCenterAdapter } from './adapters/science-center.adapter';
import { FactoryTourAdapter } from './adapters/factory-tour.adapter';
import { BroadcastingAdapter } from './adapters/broadcasting.adapter';
import { CrawlHistory } from '@/modules/crawler/entities/crawl-history.entity';
import { AdapterState } from '@/modules/crawler/entities/adapter-state.entity';
import { Institution } from '@/modules/institutions/entities/institution.entity';
import { Experience } from '@/modules/experiences/entities/experience.entity';
import { ExperienceRun } from '@/modules/experience-runs/experience-runs.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawlHistory,
      AdapterState,
      Institution,
      Experience,
      ExperienceRun,
    ]),
  ],
  providers: [
    CrawlerService,
    CrawlMonitoringService,
    DataLoaderAdapter,
    SeoulPublicServiceAdapter,
    MuseumAdapter,
    ScienceCenterAdapter,
    FactoryTourAdapter,
    BroadcastingAdapter,
  ],
  controllers: [CrawlMonitoringController],
  exports: [CrawlerService, CrawlMonitoringService],
})
export class CrawlerModule {}
