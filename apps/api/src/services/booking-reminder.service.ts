import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../modules/bookings/entities/booking.entity';
import {
  BookingReminder,
  ReminderType,
} from '../modules/bookings/entities/booking-reminder.entity';
import { EmailService } from './email.service';
import { User } from '../modules/users/entities/user.entity';

@Injectable()
export class BookingReminderService {
  private readonly logger = new Logger(BookingReminderService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(BookingReminder)
    private remindersRepository: Repository<BookingReminder>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  // 매일 아침 8시에 실행 (한국 시간)
  @Cron('0 8 * * *', { timeZone: 'Asia/Seoul' })
  async scheduleDailyReminders() {
    this.logger.log('매일 알림 스케줄 시작');

    try {
      // 7일 후 예약 찾기
      await this.processRemindersForDaysAhead(7, ReminderType.SEVEN_DAYS_BEFORE);

      // 1일 후 예약 찾기
      await this.processRemindersForDaysAhead(1, ReminderType.ONE_DAY_BEFORE);

      // 오늘 예약 찾기
      await this.processRemindersForDaysAhead(0, ReminderType.DAY_OF);

      this.logger.log('매일 알림 스케줄 완료');
    } catch (error) {
      this.logger.error(
        '알림 스케줄 처리 중 오류',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async processRemindersForDaysAhead(
    daysAhead: number,
    reminderType: ReminderType,
  ) {
    // 크론은 Asia/Seoul 기준으로 돌지만 컨테이너는 UTC이므로,
    // 날짜 계산도 반드시 KST 달력 날짜로 한다.
    const targetDate = this.addDays(this.todayInSeoul(), daysAhead);

    this.logger.log(`${daysAhead}일 후 알림 처리: ${targetDate}`);

    // experienceDate는 date 컬럼이므로 'YYYY-MM-DD' 문자열로 정확히 비교한다.
    const bookings = await this.bookingsRepository.find({
      where: {
        experienceDate: targetDate as unknown as Date,
        status: BookingStatus.CONFIRMED,
      },
      relations: ['experience', 'experience.institution', 'user'],
    });

    for (const booking of bookings) {
      await this.sendReminder(booking, reminderType);
    }
  }

  /** 서울 기준 오늘 날짜 (YYYY-MM-DD) */
  private todayInSeoul(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(ymd: string, days: number): string {
    const date = new Date(`${ymd}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  /** date 컬럼은 드라이버에 따라 문자열 또는 Date로 온다. 항상 YYYY-MM-DD로 맞춘다. */
  private toYmd(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return new Date(value).toISOString().slice(0, 10);
  }

  private async sendReminder(booking: Booking, reminderType: ReminderType) {
    try {
      // 이미 보낸 알림인지 확인
      const existingReminder = await this.remindersRepository.findOne({
        where: {
          bookingId: booking.id,
          type: reminderType,
          sent: true,
        },
      });

      if (existingReminder) {
        this.logger.log(
          `이미 보낸 알림입니다: ${booking.id} (${reminderType})`,
        );
        return;
      }

      // 사용자 이메일 가져오기
      const user = await this.usersRepository.findOne({
        where: { id: booking.userId },
      });

      if (!user || !user.email) {
        this.logger.warn(`사용자 이메일 없음: ${booking.userId}`);
        return;
      }

      // 알림 이메일 생성
      const daysUntil = this.getDaysUntil(booking.experienceDate);
      const emailHtml = this.emailService.generateReminderEmail({
        programName: booking.experience?.programName || '프로그램',
        institutionName: booking.experience?.institution?.institutionName || '-',
        experienceDate: this.toYmd(booking.experienceDate),
        daysUntil,
        confirmationNumber: booking.confirmationNumber,
      });

      let subject = '';
      if (daysUntil === 7) {
        subject = `[알림] 예약하신 프로그램이 7일 후에 있습니다`;
      } else if (daysUntil === 1) {
        subject = `[알림] 예약하신 프로그램이 내일 있습니다`;
      } else if (daysUntil === 0) {
        subject = `[알림] 오늘이 예약하신 프로그램 날입니다`;
      }

      // 이메일 전송
      const sent = await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: emailHtml,
      });

      // 알림 기록 저장
      const reminder = new BookingReminder();
      reminder.bookingId = booking.id;
      reminder.booking = booking;
      reminder.type = reminderType;
      reminder.sent = sent;
      reminder.email = user.email;
      reminder.sentAt = sent ? new Date() : null;
      reminder.errorMessage = sent ? null : '이메일 전송 실패';

      await this.remindersRepository.save(reminder);

      this.logger.log(
        `알림 ${sent ? '전송' : '실패'}: ${booking.id} (${reminderType})`,
      );
    } catch (error) {
      this.logger.error(
        `알림 처리 중 오류: ${booking.id}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private getDaysUntil(experienceDate: Date | string): number {
    const exp = Date.parse(`${this.toYmd(experienceDate)}T00:00:00Z`);
    const today = Date.parse(`${this.todayInSeoul()}T00:00:00Z`);
    return Math.round((exp - today) / (1000 * 60 * 60 * 24));
  }

  // 수동 알림 트리거 (테스트용)
  async triggerReminderForBooking(bookingId: string, type: ReminderType) {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['experience', 'experience.institution', 'user'],
    });

    if (!booking) {
      throw new Error('예약을 찾을 수 없습니다');
    }

    await this.sendReminder(booking, type);
  }

  // 예약 확인 이메일 전송 (예약 직후)
  async sendBookingConfirmationEmail(booking: Booking) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: booking.userId },
      });

      if (!user || !user.email) {
        this.logger.warn(`사용자 이메일 없음: ${booking.userId}`);
        return;
      }

      const emailHtml = this.emailService.generateBookingConfirmationEmail({
        programName: booking.experience?.programName || '프로그램',
        institutionName: booking.experience?.institution?.institutionName || '-',
        experienceDate: this.toYmd(booking.experienceDate),
        confirmationNumber: booking.confirmationNumber,
        childrenCount: booking.selectedChildren?.length || 0,
      });

      await this.emailService.sendEmail({
        to: user.email,
        subject: `[예약 확인] ${booking.experience?.programName || '프로그램'} 예약이 확인되었습니다`,
        html: emailHtml,
      });

      this.logger.log(`예약 확인 이메일 전송: ${booking.id}`);
    } catch (error) {
      this.logger.error(
        `예약 확인 이메일 전송 실패: ${booking.id}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
