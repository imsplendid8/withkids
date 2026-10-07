import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from '@/modules/health/health.module';
import { InstitutionsModule } from '@/modules/institutions/institutions.module';
import { ExperiencesModule } from '@/modules/experiences/experiences.module';
import { ExperienceRunsModule } from '@/modules/experience-runs/experience-runs.module';
import { ChangeLogsModule } from '@/modules/change-logs/change-logs.module';
import { BookingPatternsModule } from '@/modules/booking-patterns/booking-patterns.module';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { UsersModule } from '@/modules/users/users.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CrawlerModule } from '@/crawler/crawler.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { EmailService } from '@/services/email.service';
import { BookingReminderService } from '@/services/booking-reminder.service';
import { Booking } from '@/modules/bookings/entities/booking.entity';
import { BookingReminder } from '@/modules/bookings/entities/booking-reminder.entity';
import { User } from '@/modules/users/entities/user.entity';

// 프로덕션에서는 기본적으로 끄되, 마이그레이션이 엔티티와 맞지 않는 동안에는
// DB_SYNCHRONIZE=true 로 엔티티 기준 스키마를 만들 수 있게 한다.
const shouldSynchronize = () =>
  process.env.DB_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production';

const getTypeOrmConfig = () => {
  const useSqlite = process.env.USE_SQLITE === 'true' || process.env.DATABASE_URL?.includes('sqlite');

  if (useSqlite) {
    return {
      type: 'sqlite' as const,
      database: process.env.DATABASE_URL?.replace('sqlite:', '') || '/home/user/game-app/withdkis_dev.db',
      synchronize: shouldSynchronize(),
      logging: process.env.NODE_ENV === 'development',
      autoLoadEntities: true,
    };
  }

  return {
    type: 'postgres' as const,
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/withdkis_dev',
    synchronize: shouldSynchronize(),
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || 'redis_dev_password',
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    }),
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    TypeOrmModule.forFeature([Booking, BookingReminder, User]),
    HealthModule,
    InstitutionsModule,
    ExperiencesModule,
    ExperienceRunsModule,
    ChangeLogsModule,
    BookingPatternsModule,
    BookingsModule,
    ReviewsModule,
    UsersModule,
    NotificationsModule,
    AuthModule,
    CrawlerModule,
    JobsModule,
  ],
  controllers: [],
  providers: [EmailService, BookingReminderService],
})
export class AppModule {}
