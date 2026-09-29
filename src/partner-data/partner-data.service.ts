import { Injectable, HttpException, HttpStatus, Logger, ServiceUnavailableException, GatewayTimeoutException, InternalServerErrorException, Inject, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PartnerDataDto } from './dto/partner-data.dto';
import { firstValueFrom, catchError, TimeoutError } from 'rxjs';
import { AxiosError } from 'axios';
import { ClientKafka } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PartnerDataService implements OnModuleInit {
  private readonly logger = new Logger(PartnerDataService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Only connecting the producer.
    await this.kafkaClient.connect();
  }

  async sendToKafka(data: PartnerDataDto): Promise<{ request_id: string; message: string }> {
    const requestId = uuidv4();
    const topic = this.configService.get<string>('KAFKA_REQUEST_TOPIC') || 'b2b-data-request';

    const message = {
      request_id: requestId,
      partner_id: data.partner_id,
      ...data,
    };

    try {
      this.logger.log(`Publishing to Kafka | Topic: ${topic} | Request ID: ${requestId} | Partner ID: ${data.partner_id}`);
      this.logger.log(`Payload: ${JSON.stringify(message, null, 2)}`);
      
      await firstValueFrom(this.kafkaClient.emit(topic, JSON.stringify(message)));

      return {
        message: 'Partner data accepted for processing',
        request_id: requestId,
      };
    } catch (error) {
      this.logger.error(`Failed to publish message to Kafka: ${error.message}`);
      throw new ServiceUnavailableException('Message broker is currently unavailable');
    }
  }

  async forwardToNiFi(data: PartnerDataDto): Promise<any> {
    const nifiUrl = this.configService.get<string>('NIFI_BASE_URL');
    if (!nifiUrl) {
      this.logger.error('NIFI_BASE_URL is not configured');
      throw new InternalServerErrorException('NiFi configuration is missing');
    }

    const endpoint = `${nifiUrl}/partner-data`;
    
    this.logger.log(`Forwarding data for partner: ${data.partner_id} to NiFi`);
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, data).pipe(
          catchError((error: AxiosError | any) => {
            if (error instanceof TimeoutError) {
              this.logger.error(`Request to NiFi timed out: ${error.message}`);
              throw new GatewayTimeoutException('NiFi service request timed out');
            }
            this.logger.error(`Error forwarding to NiFi: ${error.message}`, error.stack);
            
            if (error.response) {
              // NiFi responded with an error status
              throw new HttpException(
                error.response.data || 'Error from NiFi processing data',
                error.response.status,
              );
            } else if (error.request) {
              // The request was made but no response was received
              throw new ServiceUnavailableException('NiFi service is currently unavailable');
            } else {
              throw new InternalServerErrorException('An unexpected error occurred communicating with NiFi');
            }
          }),
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Unexpected error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process partner data');
    }
  }
}
