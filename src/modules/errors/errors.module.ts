import { Global, Module } from '@nestjs/common';
import { ErrorsService } from '@modules/errors/services/errors.service';
import { ErrorsController } from '@modules/errors/controllers/errors.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [ErrorsController],
  providers: [ErrorsService],
  exports: [ErrorsService],
})
export class ErrorsModule {}
