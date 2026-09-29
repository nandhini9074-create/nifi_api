import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PartnerDataModule } from './partner-data/partner-data.module';
import { KafkaModule } from './kafka/kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PartnerDataModule,
    KafkaModule,
  ],
})
export class AppModule {}
