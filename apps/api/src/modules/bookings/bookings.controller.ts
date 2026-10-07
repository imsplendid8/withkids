import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('api/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return await this.bookingsService.create(user.sub, createBookingDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and filter bookings' })
  async search(
    @CurrentUser() user: JwtPayload,
    @Query('keyword') keyword?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'price_low' | 'price_high',
  ) {
    return await this.bookingsService.search(user.sub, {
      keyword,
      dateFrom,
      dateTo,
      status,
      sort,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get user bookings' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.bookingsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return await this.bookingsService.findOneByUser(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update booking (e.g., reschedule date)' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() updateData: { experienceDate?: string; specialRequests?: string },
  ) {
    await this.bookingsService.findOneByUser(user.sub, id);

    // 사용자가 바꿀 수 있는 필드만 통과시킨다. 본문을 그대로 넘기면
    // userId/status/totalPrice 등을 임의로 바꿀 수 있다.
    const changes: Partial<Booking> = {};
    if (updateData?.experienceDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(updateData.experienceDate))) {
        throw new BadRequestException('experienceDate must be YYYY-MM-DD');
      }
      changes.experienceDate = updateData.experienceDate as unknown as Date;
    }
    if (updateData?.specialRequests !== undefined) {
      changes.specialRequests = String(updateData.specialRequests);
    }
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('No updatable fields provided');
    }
    return await this.bookingsService.update(id, changes);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel booking' })
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    await this.bookingsService.findOneByUser(user.sub, id);
    return await this.bookingsService.cancel(id);
  }
}
