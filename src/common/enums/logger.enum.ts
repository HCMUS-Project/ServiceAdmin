/**
 * Defines the log levels, which are used to determine the severity of the log message.
 */

export enum LogLevel {
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    DEBUG = 'debug',
    FATAL = 'fatal', // A person must take an action immediately
    EMERGENCY = 'emergency', // One or more systems are unusable.
}

export enum LogColors {
    red = '\x1b[31m',
    green = '\x1b[32m',
    yellow = '\x1b[33m',
    blue = '\x1b[34m',
    magenta = '\x1b[35m',
    cyan = '\x1b[36m',
    pink = '\x1b[38;5;206m',
}
