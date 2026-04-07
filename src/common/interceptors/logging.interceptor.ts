import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method } = request;
    const url = request.originalUrl ?? request.url;
    const startedAt = Date.now();

    this.logger.log(`Incoming Request: ${method} ${url}`);

    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${Date.now() - startedAt}ms`,
          ),
        ),
      );
  }
}
