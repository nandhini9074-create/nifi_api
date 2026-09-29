import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class KafkaConsumer {
  private readonly logger = new Logger(KafkaConsumer.name);

  // We use the static string representation of the topic for the EventPattern decorator.
  @EventPattern('b2b-data-response')
  handleNiFiResponse(@Payload() message: any) {
    try {
      const { request_id, partner_id, status } = message;
      this.logger.log(`Received Kafka Response | Request ID: ${request_id} | Partner ID: ${partner_id} | Status: ${status}`);
    } catch (error) {
      this.logger.error(`Failed to process Kafka message: ${error.message}`);
    }
  }
}
