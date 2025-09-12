import { AuthenticationError } from './errorHandler.js';

// Admin authentication middleware
export const authenticateAdmin = (req, res, next) => {
    const passkey = req.headers['x-admin-passkey'];
    const expectedPasskey = process.env.ADMIN_PASSKEY;
    
    if (!passkey) {
        throw new AuthenticationError('Admin passkey is required');
    }
    
    if (!expectedPasskey) {
        console.error('ADMIN_PASSKEY environment variable is not set');
        throw new AuthenticationError('Server configuration error');
    }
    
    if (passkey !== expectedPasskey) {
        throw new AuthenticationError('Invalid admin passkey');
    }
    
    next();
};

// Verify passkey endpoint
export const verifyPasskey = (req, res) => {
    // If we reach here, authentication was successful
    res.json({
        success: true,
        message: 'Admin passkey verified successfully',
        timestamp: new Date().toISOString()
    });
};
