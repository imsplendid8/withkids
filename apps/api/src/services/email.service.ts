import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Gmail SMTP 설정
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(
        `이메일 전송 완료: ${options.to} (Message ID: ${result.messageId})`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `이메일 전송 실패: ${options.to}`,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP 연결 확인 완료');
      return true;
    } catch (error) {
      this.logger.error(
        'SMTP 연결 실패',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  // 예약 확인 이메일 템플릿
  generateBookingConfirmationEmail(data: {
    programName: string;
    institutionName: string;
    experienceDate: string;
    confirmationNumber: string;
    childrenCount: number;
  }): string {
    const formattedDate = new Date(data.experienceDate).toLocaleDateString(
      'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">예약이 확인되었습니다!</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; margin-top: 0;">안녕하세요!</p>

          <p style="color: #555;">아래의 프로그램 예약이 확인되었습니다:</p>

          <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 10px 0;"><strong>프로그램명:</strong> ${data.programName}</p>
            <p style="margin: 10px 0;"><strong>기관명:</strong> ${data.institutionName}</p>
            <p style="margin: 10px 0;"><strong>예약 날짜:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>참여 인원:</strong> ${data.childrenCount}명</p>
            <p style="margin: 10px 0;"><strong>예약번호:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${data.confirmationNumber}</code></p>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong style="color: #856404;">⏰ 리마인더 알림</strong>
            <p style="margin: 10px 0; color: #856404; font-size: 14px;">
              예약 7일 전, 1일 전, 당일에 리마인더 알림을 받으실 수 있습니다.
            </p>
          </div>

          <p style="color: #999; font-size: 13px; margin-top: 30px;">
            이 이메일은 자동으로 발송되었습니다. 문의사항이 있으시면 문의해주세요.
          </p>
        </div>
      </div>
    `;
  }

  // 리마인더 이메일 템플릿
  generateReminderEmail(data: {
    programName: string;
    institutionName: string;
    experienceDate: string;
    daysUntil: number;
    confirmationNumber: string;
  }): string {
    let reminderMessage = '';

    if (data.daysUntil === 7) {
      reminderMessage = '🗓️ 예약하신 프로그램이 7일 후에 있습니다!';
    } else if (data.daysUntil === 1) {
      reminderMessage = '⏰ 예약하신 프로그램이 내일 있습니다!';
    } else if (data.daysUntil === 0) {
      reminderMessage = '🎉 오늘이 예약하신 프로그램 날입니다!';
    }

    const formattedDate = new Date(data.experienceDate).toLocaleDateString(
      'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      },
    );

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; color: white; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">${reminderMessage}</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #333; margin-top: 0;">안녕하세요!</p>

          <p style="color: #555;">예약하신 프로그램을 다시 한 번 안내드립니다:</p>

          <div style="background: white; padding: 20px; border-left: 4px solid #f5576c; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 10px 0;"><strong>프로그램명:</strong> ${data.programName}</p>
            <p style="margin: 10px 0;"><strong>기관명:</strong> ${data.institutionName}</p>
            <p style="margin: 10px 0;"><strong>날짜:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>예약번호:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px;">${data.confirmationNumber}</code></p>
          </div>

          <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong style="color: #004085;">💡 팁</strong>
            <p style="margin: 10px 0; color: #004085; font-size: 14px;">
              시간에 늦지 않도록 미리 장소를 확인하시고 준비하세요!
            </p>
          </div>

          <p style="color: #999; font-size: 13px; margin-top: 30px;">
            이 이메일은 자동으로 발송되었습니다.
          </p>
        </div>
      </div>
    `;
  }
}
