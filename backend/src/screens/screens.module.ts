import { Module } from '@nestjs/common';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { ScreenGeneratorService } from './services/screen-generator.service';
import { ImageProcessorService } from './services/image-processor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScreensController],
  providers: [
    ScreensService,
    ScreenGeneratorService,
    ImageProcessorService,
  ],
  exports: [
    ScreensService,
    ScreenGeneratorService,
    ImageProcessorService,
  ],
})
export class ScreensModule {}
