import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class CreateScreenDto {
  @ApiProperty({
    example: 'Weather Dashboard',
    description: 'Screen name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Displays current weather and forecast',
    description: 'Screen description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'https://example.com/screens/weather.png',
    description: 'Full-size image URL',
  })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({
    example: 'https://example.com/screens/weather-thumb.png',
    description: 'Thumbnail image URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({
    example: 1,
    description: 'Device model ID',
  })
  @IsInt()
  modelId: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether screen is publicly accessible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
