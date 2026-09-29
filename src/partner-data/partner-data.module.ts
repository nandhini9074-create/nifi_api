import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PartnerDataController } from './partner-data.controller';
import { PartnerDataService } from './partner-data.service';
import { KafkaModule } from '../kafka/kafka.module';
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get<number>('NIFI_TIMEOUT_MS', 10000),
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
  ],
  controllers: [PartnerDataController],
  providers: [PartnerDataService],
})
export class PartnerDataModule {}
