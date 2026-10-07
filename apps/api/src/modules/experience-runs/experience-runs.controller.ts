import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ExperienceRunsService } from './experience-runs.service';
import { CreateExperienceRunDto } from './dto/create-experience-run.dto';
import { ExperienceRun } from './experience-runs.entity';

@ApiTags('Experience Runs')
@Controller('experience-runs')
export class ExperienceRunsController {
  constructor(private readonly experienceRunsService: ExperienceRunsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new experience run' })
  async create(@Body() createExperienceRunDto: CreateExperienceRunDto) {
    return await this.experienceRunsService.create(createExperienceRunDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all experience runs' })
  @ApiQuery({ name: 'upcoming', required: false, type: Boolean })
  async findAll(@Query('upcoming') upcoming?: boolean) {
    if (upcoming === true) {
      return await this.experienceRunsService.findUpcoming();
    }
    return await this.experienceRunsService.findAll();
  }

  @Get('experience/:experienceId')
  @ApiOperation({ summary: 'Get experience runs by experience ID' })
  async findByExperienceId(@Param('experienceId') experienceId: string) {
    return await this.experienceRunsService.findByExperienceId(experienceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experience run by ID' })
  async findOne(@Param('id') id: string) {
    return await this.experienceRunsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update experience run' })
  async update(@Param('id') id: string, @Body() data: Partial<ExperienceRun>) {
    return await this.experienceRunsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete experience run' })
  async remove(@Param('id') id: string) {
    return await this.experienceRunsService.remove(id);
  }
}
