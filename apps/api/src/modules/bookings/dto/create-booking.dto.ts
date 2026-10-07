import { IsUUID, IsArray, ArrayMinSize, IsString, IsOptional, IsInt, Min, Matches } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  experienceId: string;

  /** 체험하는 날 (YYYY-MM-DD). 캘린더·D-day·알림 메일이 모두 이 값을 기준으로 한다. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'experienceDate must be YYYY-MM-DD' })
  experienceDate: string;

  @IsArray()
  @ArrayMinSize(1)
  selectedChildren: Array<{ id: string; name: string; age: number }>;

  @IsString()
  @IsOptional()
  specialRequests?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalPrice?: number;
}
