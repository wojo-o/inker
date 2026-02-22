import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateCustomWidgetDto {
  @ApiPropertyOptional({ example: 'Bitcoin Price Widget' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Displays current BTC price' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID of the data source to use',
  })
  @IsOptional()
  @IsInt()
  dataSourceId?: number;

  @ApiPropertyOptional({
    example: 'value',
    enum: ['value', 'list', 'script', 'grid'],
    description: 'How to display the data',
  })
  @IsOptional()
  @IsString()
  @IsIn(['value', 'list', 'script', 'grid'])
  displayType?: string;

  @ApiPropertyOptional({
    example: '{{name}}: ${{price}}',
    description: 'Template string for template display type',
  })
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional({
    example: { fontSize: 24, textAlign: 'center' },
    description: 'Layout and style configuration',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 150,
    description: 'Minimum widget width in pixels',
  })
  @IsOptional()
  @IsInt()
  @Min(50)
  minWidth?: number;

  @ApiPropertyOptional({
    example: 80,
    description: 'Minimum widget height in pixels',
  })
  @IsOptional()
  @IsInt()
  @Min(30)
  minHeight?: number;
}
