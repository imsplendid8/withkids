import { Controller, Get, Post, Body, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.service';

@ApiTags('Reviews')
@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new review' })
  async create(@CurrentUser() user: JwtPayload, @Body() createReviewDto: CreateReviewDto) {
    return await this.reviewsService.create(user.sub, createReviewDto);
  }

  @Get('experience/:experienceId')
  @ApiOperation({ summary: 'Get reviews for an experience' })
  async findByExperience(
    @Param('experienceId') experienceId: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return await this.reviewsService.findByExperience(experienceId, limit, offset);
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get review for a booking' })
  async findByBooking(@Param('bookingId') bookingId: string) {
    return await this.reviewsService.findByBooking(bookingId);
  }

  @Get('user/my-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user reviews' })
  async findByUser(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return await this.reviewsService.findByUser(user.sub, limit, offset);
  }

  @Put(':reviewId/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark review as helpful' })
  async markAsHelpful(@Param('reviewId') reviewId: string, @CurrentUser() user: JwtPayload) {
    return await this.reviewsService.markAsHelpful(reviewId, user.sub);
  }

  @Get('experience/:experienceId/rating')
  @ApiOperation({ summary: 'Get average rating for experience' })
  async getAverageRating(@Param('experienceId') experienceId: string) {
    return await this.reviewsService.getAverageRating(experienceId);
  }
}
