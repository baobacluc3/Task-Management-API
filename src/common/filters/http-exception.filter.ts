import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
      error = 'Entity Not Found';
    } else if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Database query failed';
      error = 'Query Failed';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseBody = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };
        message = responseBody.message ?? message;
        error = responseBody.error ?? exception.name;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
    });
  }
}
