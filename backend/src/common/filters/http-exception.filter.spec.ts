import { HttpExceptionFilter } from './http-exception.filter';
import {
  NotFoundException,
  BadRequestException,
  HttpStatus,
  ArgumentsHost,
} from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockImplementation(() => ({ json: mockJson }));
    mockResponse = {
      status: mockStatus,
    };
    mockRequest = {
      url: '/api/v1/projects',
    };
    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format NotFoundException into standard Azerbaijani envelope', () => {
    const exception = new NotFoundException();
    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Axtarılan resurs və ya səhifə tapılmadı',
        path: '/api/v1/projects',
      }),
    );
    expect(mockJson.mock.calls[0][0].timestamp).toBeDefined();
  });

  it('should localize default NestJS 404 route messages (Cannot GET / Cannot POST)', () => {
    const getException = new NotFoundException('Cannot GET /api/v1/nonexistent');
    filter.catch(getException, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Axtarılan resurs və ya səhifə tapılmadı',
        path: '/api/v1/projects',
      }),
    );

    const postException = new NotFoundException('Cannot POST /api/v1/submit');
    filter.catch(postException, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Axtarılan resurs və ya səhifə tapılmadı',
        path: '/api/v1/projects',
      }),
    );
  });

  it('should preserve custom Azerbaijani message in NotFoundException', () => {
    const customException = new NotFoundException('Fayl sistemdə tapılmadı');
    filter.catch(customException, mockArgumentsHost);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: 'Fayl sistemdə tapılmadı',
      }),
    );
  });

  it('should format BadRequestException with array of messages', () => {
    const messages = ['Bu xana mütləq doldurulmalıdır', 'Düzgün e-poçt daxil edin'];
    const exception = new BadRequestException(messages);
    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: messages,
        error: 'Bad Request',
        path: '/api/v1/projects',
      }),
    );
  });

  it('should handle unhandled runtime Error with 500 status and localized message', () => {
    const exception = new Error('Unexpected crash');
    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Daxili server xətası baş verdi. Zəhmət olmasa texniki dəstəyə müraciət edin',
        path: '/api/v1/projects',
      }),
    );
  });
});
