import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class AutoProvisionDto {
  @ApiProperty({
    example: 'AA:BB:CC:DD:EE:FF',
    description: 'Device MAC address',
  })
  @IsString()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'Invalid MAC address format',
  })
  macAddress: string;

  @ApiPropertyOptional({
    example: '1.0.5',
    description: 'Device firmware version',
  })
  @IsOptional()
  @IsString()
  firmwareVersion?: string;
}
