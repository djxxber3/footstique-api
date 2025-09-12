// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
        
        console.log(`${statusEmoji} ${req.method} ${req.url} - ${status} - ${duration}ms`);
    });
    
    next();
};

// API response logger
export const logApiResponse = (req, res, data) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`API Response for ${req.method} ${req.url}:`, {
            status: res.statusCode,
            dataType: typeof data,
            dataLength: Array.isArray(data) ? data.length : 'N/A',
            timestamp: new Date().toISOString()
        });
    }
};
