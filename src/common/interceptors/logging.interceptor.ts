import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const partnerId = request.body?.partner_id || 'UNKNOWN';

    this.logger.log(`Incoming request received: ${method} ${url} | partner_id: ${partnerId}`);
    this.logger.log(`Request Body: ${JSON.stringify(request.body, null, 2)}`);

    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() => this.logger.log(`Request completed: ${method} ${url} | partner_id: ${partnerId} | ${Date.now() - now}ms`)),
      );
  }
}
