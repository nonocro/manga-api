import {
  Catch,
  ExceptionFilter,
  Logger,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message =
        typeof body === 'string'
          ? body
          : ((body as any).message ?? exception.message);
      error = this.statusToError(status);
    } else {
      // Erreur interne non anticipée
      status = 500;
      error = 'Internal Server Error';
      message = 'An unexpected error occurred. Please contact support.';
      // Détail de l'erreur loggé côté serveur uniquement — jamais exposé au client
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  statusToError(status: number): string {
    if (status >= 400 && status < 500) {
      return 'Bad Request';
    } else if (status >= 500) {
      return 'Internal Server Error';
    }
    return 'Error';
  }
}
