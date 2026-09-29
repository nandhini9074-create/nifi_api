import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { PartnerDataService } from './partner-data.service';
import { PartnerDataDto } from './dto/partner-data.dto';

@Controller('partner-data')
export class PartnerDataController {
  private readonly logger = new Logger(PartnerDataController.name);

  constructor(private readonly partnerDataService: PartnerDataService) { }

  @Post('http')
  @HttpCode(200)
  async processDataHttp(@Body() partnerData: PartnerDataDto) {
    this.logger.log('=== Received Data on /http endpoint (Direct Forward) ===');
    this.logger.log(`Payload: ${JSON.stringify(partnerData, null, 2)}`);
    return this.partnerDataService.forwardToNiFi(partnerData);
  }

  @Post('kafka')
  @HttpCode(202) // Return HTTP 202 Accepted for async processing
  async processDataKafka(@Body() partnerData: PartnerDataDto) {
    this.logger.log('=== Received Data on /kafka endpoint (Async Queue) ===');
    return this.partnerDataService.sendToKafka(partnerData);
  }

  // This endpoint now handles the default route for the controller
  @Post()
  @HttpCode(200)
  async receiveNiFiResponse(@Body() nifiResponseData: any) {
    this.logger.log('=== Received Response from NiFi ===');
    this.logger.log(`NiFi Payload: ${JSON.stringify(nifiResponseData, null, 2)}`);
    this.logger.log('===================================');

    return {
      message: 'NiFi response received and logged successfully',
      status: 'success'
    };
  }
}
