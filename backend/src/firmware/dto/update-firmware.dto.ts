import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

export class UpdateFirmwareDto {
  @ApiPropertyOptional({
    example: '1.2.3',
    description: 'Firmware version number',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/firmware/v1.2.3.bin',
    description: 'Firmware download URL',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  downloadUrl?: string;

  @ApiPropertyOptional({
    example: 'Bug fixes and performance improvements',
    description: 'Release notes',
  })
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this is a stable release',
  })
  @IsOptional()
  @IsBoolean()
  isStable?: boolean;
}
