import express from 'express';
import matchService from '../services/matchService.js';
import channelService from '../services/channelService.js';
import categoryService from '../services/categoryService.js';
import syncService from '../services/syncService.js';
import { authenticateAdmin, verifyPasskey } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { logApiResponse } from '../middleware/logger.js';

const router = express.Router();

// Health check for admin (no auth required)
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Admin API is healthy',
        timestamp: new Date().toISOString()
    });
});

// Verify admin passkey (no auth required - this IS the auth endpoint)
router.post('/verify-passkey', verifyPasskey);

// Apply admin authentication to all other routes
router.use(authenticateAdmin);

// Disable caching for all admin endpoints
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// --- MATCHES ENDPOINTS ---

// Get all matches for a specific date (including those without channels)
router.get('/matches/:date', 
    validate(schemas.dateParam, 'params'),
    async (req, res, next) => {
        try {
            const { date } = req.params;
            const matches = await matchService.getAllMatches(date);
            const stats = await matchService.getMatchesStats(date);
            
            const response = {
                success: true,
                data: {
                    matches,
                    stats,
                    date,
                    total_count: matches.length
                },
                timestamp: new Date().toISOString(),
                cache_buster: Date.now()
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Get specific match details
router.get('/matches/:date/:match_id',
    validate(schemas.dateParam, 'params'),
    validate(schemas.matchIdParam, 'params'),
    async (req, res, next) => {
        try {
            const { match_id } = req.params;
            const match = await matchService.getMatchById(match_id);
            
            const response = {
                success: true,
                data: match
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Link channels to a match
router.post('/matches/link-channels',
    validate(schemas.linkChannels),
    async (req, res, next) => {
        try {
            const { match_id, channel_ids } = req.body;
            const updatedMatch = await matchService.linkChannelsToMatch(match_id, channel_ids);
            
            const response = {
                success: true,
                message: 'Channels linked successfully',
                data: updatedMatch
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// --- CHANNELS ENDPOINTS ---

// Get all channels (including inactive)
router.get('/channels', async (req, res, next) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const channels = await channelService.getAllChannels(includeInactive);
        
        const response = {
            success: true,
            data: {
                channels,
                total_count: channels.length
            }
        };
        
        logApiResponse(req, res, response);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get channels with statistics
router.get('/channels/stats', async (req, res, next) => {
    try {
        const channels = await channelService.getChannelsWithStats();
        const stats = await channelService.getChannelStats();
        
        const response = {
            success: true,
            data: {
                channels,
                summary: stats
            }
        };
        
        logApiResponse(req, res, response);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get specific channel
router.get('/channels/:id',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const channel = await channelService.getChannelById(id);
            
            const response = {
                success: true,
                data: channel
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Create new channel
router.post('/channels',
    validate(schemas.createChannel),
    async (req, res, next) => {
        try {
            const channel = await channelService.createChannel(req.body);
            
            const response = {
                success: true,
                message: 'Channel created successfully',
                data: channel
            };
            
            logApiResponse(req, res, response);
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Update channel
router.put('/channels/:id',
    validate(schemas.idParam, 'params'),
    validate(schemas.updateChannel),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const channel = await channelService.updateChannel(id, req.body);
            
            const response = {
                success: true,
                message: 'Channel updated successfully',
                data: channel
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Delete channel
router.delete('/channels/:id',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await channelService.deleteChannel(id);
            
            logApiResponse(req, res, result);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Deactivate channel
router.patch('/channels/:id/deactivate',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const channel = await channelService.deactivateChannel(id);
            
            const response = {
                success: true,
                message: 'Channel deactivated successfully',
                data: channel
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Unlink all matches from a channel
router.post('/channels/:id/unlink-all-matches',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            await channelService.unlinkAllMatches(id);
            
            const response = {
                success: true,
                message: 'All matches unlinked from channel successfully'
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Activate channel
router.patch('/channels/:id/activate',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const channel = await channelService.activateChannel(id);
            
            const response = {
                success: true,
                message: 'Channel activated successfully',
                data: channel
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// --- SYNC ENDPOINTS ---

// Manual sync trigger
router.post('/sync', async (req, res, next) => {
    try {
        const result = await syncService.syncMatches();
        
        logApiResponse(req, res, result);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get sync status
router.get('/sync/status', async (req, res, next) => {
    try {
        const status = syncService.getSyncStatus();
        const lastSyncDate = await syncService.getLastSyncDate();
        
        const response = {
            success: true,
            data: {
                ...status,
                lastSyncDate
            }
        };
        
        logApiResponse(req, res, response);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get sync history
router.get('/sync/history',
    // **تطبيق التحقق من حقل 'limit'**
    validate(schemas.limitQuery, 'query'),
    async (req, res, next) => {
        try {
            // Joi provides a default value if 'limit' is not present
            const { limit } = req.query;
            const history = await syncService.getSyncHistory(limit);
            
            const response = {
                success: true,
                data: {
                    history,
                    total_count: history.length
                }
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// --- CATEGORIES ENDPOINTS ---

// Get all categories
router.get('/categories', async (req, res, next) => {
    try {
        const includeInactive = req.query.include_inactive === 'true';
        const categories = await categoryService.getAllCategories(includeInactive);
        
        const response = {
            success: true,
            data: {
                categories,
                total_count: categories.length
            }
        };
        
        logApiResponse(req, res, response);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

// Get specific category
router.get('/categories/:id',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const category = await categoryService.getCategoryById(id);
            
            const response = {
                success: true,
                data: category
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Create new category
router.post('/categories',
    validate(schemas.createCategory),
    async (req, res, next) => {
        try {
            const category = await categoryService.createCategory(req.body);
            
            const response = {
                success: true,
                message: 'Category created successfully',
                data: category
            };
            
            logApiResponse(req, res, response);
            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Update category
router.put('/categories/:id',
    validate(schemas.idParam, 'params'),
    validate(schemas.updateCategory),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const category = await categoryService.updateCategory(id, req.body);
            
            const response = {
                success: true,
                message: 'Category updated successfully',
                data: category
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Delete category
router.delete('/categories/:id',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await categoryService.deleteCategory(id);
            
            logApiResponse(req, res, result);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
);

// Toggle category status
router.patch('/categories/:id/toggle',
    validate(schemas.idParam, 'params'),
    async (req, res, next) => {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            const category = await categoryService.toggleCategoryStatus(id, is_active);
            
            const response = {
                success: true,
                message: `Category ${is_active ? 'activated' : 'deactivated'} successfully`,
                data: category
            };
            
            logApiResponse(req, res, response);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }
);

// Get category statistics
router.get('/categories/stats', async (req, res, next) => {
    try {
        const stats = await categoryService.getCategoryStats();
        
        const response = {
            success: true,
            data: stats
        };
        
        logApiResponse(req, res, response);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

export default router;