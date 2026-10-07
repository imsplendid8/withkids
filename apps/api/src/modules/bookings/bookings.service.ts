import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
  ) {}

  async create(userId: string, createBookingDto: CreateBookingDto): Promise<Booking> {
    const confirmationNumber = this.generateConfirmationNumber();

    const booking = this.bookingsRepository.create({
      userId,
      experienceId: createBookingDto.experienceId,
      selectedChildren: createBookingDto.selectedChildren,
      specialRequests: createBookingDto.specialRequests,
      totalPrice: createBookingDto.totalPrice,
      numberOfParticipants: createBookingDto.selectedChildren.length,
      confirmationNumber,
      status: BookingStatus.CONFIRMED,
      // date 컬럼이라 문자열 그대로 저장해야 시간대 변환으로 날짜가 밀리지 않는다.
      experienceDate: createBookingDto.experienceDate as unknown as Date,
    });

    return await this.bookingsRepository.save(booking);
  }

  async findAll(userId: string): Promise<Booking[]> {
    return await this.bookingsRepository.find({
      where: { userId },
      relations: ['experience', 'experience.institution', 'reviews'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['experience', 'experience.institution', 'reviews'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async findOneByUser(userId: string, bookingId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId);

    if (booking.userId !== userId) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found for user ${userId}`);
    }

    return booking;
  }

  async update(id: string, data: Partial<Booking>): Promise<Booking> {
    await this.bookingsRepository.update(id, data);
    return await this.findOne(id);
  }

  async cancel(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    booking.status = BookingStatus.CANCELLED;
    return await this.bookingsRepository.save(booking);
  }

  async markAsCompleted(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    booking.status = BookingStatus.COMPLETED;
    return await this.bookingsRepository.save(booking);
  }

  async search(
    userId: string,
    searchParams: {
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      sort?: 'newest' | 'oldest' | 'price_low' | 'price_high';
    } = {},
  ): Promise<Booking[]> {
    let query = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.experience', 'experience')
      .leftJoinAndSelect('experience.institution', 'institution')
      .where('booking.userId = :userId', { userId });

    // 키워드 검색 (프로그램명, 기관명)
    if (searchParams.keyword) {
      query = query.andWhere(
        '(experience.programName ILIKE :keyword OR institution.institutionName ILIKE :keyword)',
        { keyword: `%${searchParams.keyword}%` },
      );
    }

    // 날짜 범위 필터
    if (searchParams.dateFrom && searchParams.dateTo) {
      query = query.andWhere(
        'booking.experienceDate BETWEEN :dateFrom AND :dateTo',
        {
          dateFrom: new Date(searchParams.dateFrom),
          dateTo: new Date(searchParams.dateTo),
        },
      );
    } else if (searchParams.dateFrom) {
      query = query.andWhere('booking.experienceDate >= :dateFrom', {
        dateFrom: new Date(searchParams.dateFrom),
      });
    } else if (searchParams.dateTo) {
      query = query.andWhere('booking.experienceDate <= :dateTo', {
        dateTo: new Date(searchParams.dateTo),
      });
    }

    // 상태 필터
    if (searchParams.status) {
      query = query.andWhere('booking.status = :status', {
        status: searchParams.status,
      });
    }

    // 정렬
    switch (searchParams.sort) {
      case 'oldest':
        query = query.orderBy('booking.createdAt', 'ASC');
        break;
      case 'price_low':
        query = query.orderBy('booking.totalPrice', 'ASC');
        break;
      case 'price_high':
        query = query.orderBy('booking.totalPrice', 'DESC');
        break;
      case 'newest':
      default:
        query = query.orderBy('booking.createdAt', 'DESC');
    }

    return await query.getMany();
  }

  private generateConfirmationNumber(): string {
    return `BK-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  }
}
