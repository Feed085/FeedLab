export interface DatabaseConfig {
  uri: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface StorageConfig {
  driver: 'local' | 'r2';
  localPath: string;
  maxFileSizeMb: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  mongodb: DatabaseConfig;
  corsOrigin: string;
  jwt: JwtConfig;
  storage: StorageConfig;
}

export const configuration = (): AppConfig => {
  const port = parseInt(process.env.PORT || '3000', 10);
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/feedlab';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const jwtSecret =
    process.env.JWT_SECRET || 'feedlab_dev_jwt_secret_key_min_32_characters_long';
  const jwtRefreshSecret =
    process.env.JWT_REFRESH_SECRET || 'feedlab_dev_jwt_refresh_secret_key_min_32_chars';

  // Strict validation
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT configuration: ${process.env.PORT}`);
  }

  if (!mongodbUri || (!mongodbUri.startsWith('mongodb://') && !mongodbUri.startsWith('mongodb+srv://'))) {
    throw new Error(`Invalid MONGODB_URI configuration: ${mongodbUri}`);
  }

  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  return {
    port,
    nodeEnv,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    mongodb: {
      uri: mongodbUri,
    },
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      refreshSecret: jwtRefreshSecret,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    storage: {
      driver: (process.env.STORAGE_DRIVER as 'local' | 'r2') || 'local',
      localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
      maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
    },
  };
};
