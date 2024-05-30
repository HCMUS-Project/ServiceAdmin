/**
 * Represents a custom exception that is thrown when a client request is malformed or invalid.
 * Extends the HttpException class from the '@nestjs/common' module.
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';

export class BadRequestException extends HttpException {
    constructor(message: string, error: string) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}

export class NotFoundException extends HttpException {
    constructor(message: string) {
        super(message, HttpStatus.NOT_FOUND);
    }
}

export class UserNotFoundException extends UnauthorizedException {
    constructor(message = 'User not found', error?: string) {
        super(message, error);
    }
}

export class InvalidPasswordException extends UnauthorizedException {
    constructor(message = 'Invalid password', error?: string) {
        super(message, error);
    }
}

export class ValidationFailedException extends BadRequestException {
    constructor(message = 'Validation failed', error?: string) {
        super(message, error);
    }
}

export class ForbiddenException extends BadRequestException {
    constructor(message: string, error: string) {
        super(message, error);
    }
}

export class UnActivatedUserException extends UnauthorizedException {
    constructor(message = 'Unactive account', error?: string) {
        super(message, error);
    }
}
