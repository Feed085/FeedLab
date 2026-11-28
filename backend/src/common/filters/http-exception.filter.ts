import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HTTP_EXCEPTION_MESSAGES } from '../i18n/az.messages';
import { ErrorResponseEnvelope } from '../interfaces/error-response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Daxili server xətası baş verdi. Zəhmət olmasa texniki dəstəyə müraciət edin';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const fallback = HTTP_EXCEPTION_MESSAGES[status] || {
        error: exception.name.replace(/Exception$/, '') || 'Error',
        defaultMessage: exception.message || 'Xəta baş verdi',
      };

      error = fallback.error;

      if (typeof exceptionResponse === 'string') {
        if (
          exceptionResponse === fallback.error ||
          exceptionResponse === exception.message ||
          (status === HttpStatus.NOT_FOUND && exceptionResponse.startsWith('Cannot ')) ||
          /^Cannot (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s/i.test(exceptionResponse)
        ) {
          message = fallback.defaultMessage;
        } else {
          message = exceptionResponse;
        }
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const respObj = exceptionResponse as Record<string, any>;
        if (respObj.message) {
          if (
            typeof respObj.message === 'string' &&
            (respObj.message === fallback.error ||
              respObj.message === 'Not Found' ||
              respObj.message === 'Bad Request' ||
              respObj.message === 'Forbidden' ||
              respObj.message === 'Unauthorized' ||
              respObj.message === 'Internal Server Error' ||
              respObj.message === 'Service Unavailable' ||
              (status === HttpStatus.NOT_FOUND && respObj.message.startsWith('Cannot ')) ||
              /^Cannot (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s/i.test(respObj.message))
          ) {
            message = fallback.defaultMessage;
          } else {
            message = respObj.message;
          }
        } else {
          message = fallback.defaultMessage;
        }

        if (respObj.error) {
          error = respObj.error;
        }
      } else {
        message = fallback.defaultMessage;
      }
    } else if (exception instanceof Error) {
      const anyErr = exception as any;
      if (anyErr.status === 413 || anyErr.statusCode === 413 || anyErr.type === 'entity.too.large') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        error = 'Payload Too Large';
        message = 'Fayl ölçüsü maksimum həddi aşır';
      } else if (anyErr.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'Bu xana mütləq doldurulmalıdır';
      } else if (anyErr.name === 'CastError') {
        status = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = 'Məlumat tapılmadı';
      } else if (typeof anyErr.status === 'number') {
        status = anyErr.status;
        const fallback = HTTP_EXCEPTION_MESSAGES[status] || {
          error: anyErr.name || 'Error',
          defaultMessage: anyErr.message || 'Xəta baş verdi',
        };
        error = fallback.error;
        message = fallback.defaultMessage;
      } else {
        this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      }
    } else {
      this.logger.error('Unhandled unknown exception', exception);
    }

    const errorResponse: ErrorResponseEnvelope = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request?.url || '',
    };

    response.status(status).json(errorResponse);
  }
}
