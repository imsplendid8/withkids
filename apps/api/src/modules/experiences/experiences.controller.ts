import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExperiencesService } from './experiences.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { Experience } from './entities/experience.entity';

@ApiTags('Experiences')
@Controller('api/experiences')
export class ExperiencesController {
  constructor(private readonly experiencesService: ExperiencesService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new experience program' })
  async create(@Body() createExperienceDto: CreateExperienceDto) {
    return await this.experiencesService.create(createExperienceDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search and filter experiences' })
  async search(
    @Query('search') search?: string,
    @Query('ageGroup') ageGroup?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('category') category?: string,
    @Query('sort') sort?: 'recent' | 'price-low' | 'price-high' | 'name',
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return await this.experiencesService.search({
      search,
      ageGroup,
      priceMin,
      priceMax,
      category,
      sort,
      limit,
      offset,
    });
  }

  // ':id'보다 먼저 선언해야 'booking-schedule'이 id로 잡히지 않는다.
  @Get('booking-schedule')
  @ApiOperation({ summary: '접수 중이거나 곧 접수가 시작되는 회차' })
  async getBookingSchedule(@Query('days') days?: string) {
    const parsed = Number(days);
    const window = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 60) : 14;
    return await this.experiencesService.getBookingSchedule(window);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active experience programs' })
  async findAll() {
    return await this.experiencesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experience program by ID' })
  async findOne(@Param('id') id: string) {
    return await this.experiencesService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update experience program' })
  async update(@Param('id') id: string, @Body() data: Partial<Experience>) {
    return await this.experiencesService.update(id, data);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete experience program (soft delete)' })
  async remove(@Param('id') id: string) {
    return await this.experiencesService.remove(id);
  }
}
