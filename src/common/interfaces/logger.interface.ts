import { LogLevel } from 'src/common/enums/logger.enum';

export interface Log {
    timestamp: number; // Unix timestamp
    level: LogLevel; // Log level
    message: string; // Log message
    data: LogData; // Log data
}

export interface LogData {
    organization?: string; // Organization or project name
    context?: string; // Bounded Context name
    app?: string; // Application or Microservice name
    sourceClass?: string; // Classname of the source
    correlationId?: string; // Correlation ID
    error?: Error; // Error object
    props?: NodeJS.Dict<any>; // Additional custom properties
}
