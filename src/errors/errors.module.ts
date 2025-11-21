import { Global, Module } from '@nestjs/common';
import { ErrorsService } from './errors.service';
import { ErrorsController } from './errors.controller';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [ErrorsController],
  providers: [ErrorsService],
  exports: [ErrorsService],
})
export class ErrorsModule {}
