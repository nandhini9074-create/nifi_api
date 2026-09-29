import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = 
      exception instanceof HttpException 
        ? exception.getResponse() 
        : { message: 'Internal server error' };

    let errorResponse: any;

    if (typeof exceptionResponse === 'string') {
      errorResponse = { message: exceptionResponse };
    } else {
      errorResponse = exceptionResponse;
    }

    // Ensure we don't return stack traces to clients
    response.status(status).json({
      success: false,
      partner_id: request.body?.partner_id || 'UNKNOWN',
      error: errorResponse.message || errorResponse.error || 'Request processing failed',
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
