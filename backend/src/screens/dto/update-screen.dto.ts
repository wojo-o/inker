import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class UpdateScreenDto {
  @ApiPropertyOptional({
    example: 'Weather Dashboard',
    description: 'Screen name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Displays current weather and forecast',
    description: 'Screen description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/screens/weather.png',
    description: 'Full-size image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/screens/weather-thumb.png',
    description: 'Thumbnail image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Device model ID',
  })
  @IsOptional()
  @IsInt()
  modelId?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether screen is publicly accessible',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
