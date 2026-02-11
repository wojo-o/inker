import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PlaylistScreenDto {
  @IsString()
  screenId: string;

  @IsOptional()
  duration?: number;

  @IsOptional()
  order?: number;
}

export class CreatePlaylistDto {
  @ApiProperty({
    example: 'Morning Rotation',
    description: 'Playlist name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Screens to display in the morning',
    description: 'Playlist description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the playlist is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Screens in the playlist',
    type: [PlaylistScreenDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaylistScreenDto)
  screens?: PlaylistScreenDto[];
}
