import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { Institution } from './entities/institution.entity';

@ApiTags('Institutions')
@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new institution' })
  async create(@Body() createInstitutionDto: CreateInstitutionDto) {
    return await this.institutionsService.create(createInstitutionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active institutions' })
  async findAll() {
    return await this.institutionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get institution by ID' })
  async findOne(@Param('id') id: string) {
    return await this.institutionsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update institution' })
  async update(@Param('id') id: string, @Body() data: Partial<Institution>) {
    return await this.institutionsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete institution (soft delete)' })
  async remove(@Param('id') id: string) {
    return await this.institutionsService.remove(id);
  }
}
