// Custom error classes
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 400);
        this.field = field;
    }
}

export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

export class ExternalAPIError extends AppError {
    constructor(message = 'External API error', statusCode = 502) {
        super(message, statusCode);
    }
}

// Error handler middleware
export const errorHandler = (error, req, res, next) => {
    // Log error details
    console.error(`[${new Date().toISOString()}] Error:`, {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Handle operational errors
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            ...(error.field && { field: error.field }),
            timestamp: new Date().toISOString()
        });
    }

    // Removed MySQL-specific error handling (not applicable)

    // Handle Joi validation errors
    if (error.details) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            })),
            timestamp: new Date().toISOString()
        });
    }

    // Handle unexpected errors
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message,
        timestamp: new Date().toISOString()
    });
};
