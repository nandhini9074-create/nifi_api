import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaConsumer } from './kafka.consumer';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_PRODUCER',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: configService.get<string>('KAFKA_CLIENT_ID'),
              brokers: [configService.get<string>('KAFKA_BROKERS')],
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [KafkaConsumer],
  providers: [],
  exports: [ClientsModule], // Export so PartnerDataService can inject KAFKA_PRODUCER
})
export class KafkaModule {}
