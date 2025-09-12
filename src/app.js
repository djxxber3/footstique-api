import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';

// Import configurations
import connectDatabase from './config/database.js';
import syncService, { startDailySync } from './services/syncService.js';

// Import routes
import adminRoutes from './routes/admin.js';
import clientRoutes from './routes/client.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Load environment variables
dotenv.config();

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware (CSP disabled to avoid blocking inline scripts/styles for now)
app.use(helmet({
    contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors());

// 2. استخدام وسيط ضغط الاستجابات
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter); // Apply limiter only to API routes

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);

// Serve static files for admin panel
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Route handlers for serving HTML files
app.get('/admin', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/client', (req, res) => {
    res.sendFile(path.join(publicPath, 'client.html'));
});

app.get('/', (req, res) => {
    res.redirect('/client');
});

// 404 handler
app.use('*', (req, res) => {
    if (req.accepts('html')) {
        res.status(404).send('<h1>Page not found</h1>');
    } else {
        res.status(404).json({ error: 'Route not found' });
    }
});

// Global error handler
app.use(errorHandler);

// Schedule daily sync
const syncHour = Number(process.env.SYNC_HOUR || 2);
const syncMinute = Number(process.env.SYNC_MINUTE || 0);
// Initialize scheduler status and compute next run
syncService.updateSchedulerStatus(true, syncHour, syncMinute, process.env.TIMEZONE || 'Africa/Algiers');

cron.schedule(`${syncMinute} ${syncHour} * * *`, async () => {
    console.log('🔄 Starting scheduled daily sync...');
    try {
        await startDailySync();
        // Update next run after successful or failed run
        syncService.updateSchedulerStatus(true, syncHour, syncMinute, process.env.TIMEZONE || 'Africa/Algiers');
    } catch (error) {
        console.error('❌ Scheduled sync failed:', error.message);
        // Still update next run time
        syncService.updateSchedulerStatus(true, syncHour, syncMinute, process.env.TIMEZONE || 'Africa/Algiers');
    }
}, {
    timezone: process.env.TIMEZONE || "Africa/Algiers"
});

// Start server
const startServer = async () => {
    try {
        await connectDatabase();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
            console.log(`🔧 Admin panel at http://localhost:${PORT}/admin`);
            console.log(`🌍 Client app at http://localhost:${PORT}/client`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

export default app;