export interface ErrorResponseEnvelope {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
