import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { WithholdingTaxService } from './withholding-tax.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [WithholdingTaxService],
})
export class AppModule {}
