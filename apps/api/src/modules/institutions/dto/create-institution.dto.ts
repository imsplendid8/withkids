import { IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum InstitutionType {
  PUBLIC = 'PUBLIC',
  MUSEUM = 'MUSEUM',
  SCIENCE_CENTER = 'SCIENCE_CENTER',
  FACTORY = 'FACTORY',
  BROADCASTING = 'BROADCASTING',
  OTHER = 'OTHER',
}

export class CreateInstitutionDto {
  @IsString()
  @ApiProperty({ description: 'Institution name' })
  institutionName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Institution description', required: false })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ description: 'Institution website URL', required: false })
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Institution phone number', required: false })
  phone?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Institution address', required: false })
  address?: string;

  @IsOptional()
  @IsEnum(InstitutionType)
  @ApiProperty({ description: 'Institution type', enum: InstitutionType, required: false })
  institutionType?: InstitutionType;
}
