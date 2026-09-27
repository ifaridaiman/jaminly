import { Module } from '@nestjs/common';
import { GoogleVerifierService } from './google-verifier.service';

@Module({
  providers: [GoogleVerifierService],
  exports: [GoogleVerifierService],
})
export class GoogleModule {}
