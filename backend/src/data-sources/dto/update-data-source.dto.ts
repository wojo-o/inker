import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsBoolean,
  IsInt,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateDataSourceDto {
  @ApiPropertyOptional({ example: 'Bitcoin Price API' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Fetches current BTC price' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'json',
    enum: ['json', 'rss'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['json', 'rss'])
  type?: string;

  @ApiPropertyOptional({
    example: 'https://api.example.com/data',
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'URL must be a valid URL' })
  url?: string;

  @ApiPropertyOptional({
    example: 'GET',
    enum: ['GET', 'POST'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST'])
  method?: string;

  @ApiPropertyOptional({
    example: { 'X-API-Key': 'your-api-key' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    example: 300,
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  refreshInterval?: number;

  @ApiPropertyOptional({
    example: '$.data.price',
  })
  @IsOptional()
  @IsString()
  jsonPath?: string;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
