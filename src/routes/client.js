import express from 'express';
import matchService from '../services/matchService.js';
import channelService from '../services/channelService.js';
import categoryService from '../services/categoryService.js';
import { validate, schemas } from '../middleware/validation.js';
import { logApiResponse } from '../middleware/logger.js';

const router = express.Router();

// Health check for client
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Client API is healthy',
        timestamp: new Date().toISOString()
    });
});

// Get matches with channels for a specific date (client endpoint)
router.get('/matches/:date',
    validate(schemas.dateParam, 'params'),
    async (req, res, next) => {
        try {
            const { date } = req.params;
            
            // Get all matches for the given date, including those without channels
            const matches = await matchService.getAllMatches(date);
            
            // Transform response for client consumption
            const clientMatches = matches.map(match => {
                const channelsMap = new Map();
                
                if (match.channels) {
                    match.channels.forEach(channel => {
                        if (!channelsMap.has(channel.id)) {
                            channelsMap.set(channel.id, {
                                name: channel.name,
                                logo: channel.logo_url,
                                streams: []
                            });
                        }
                        
                        if (channel.streams) {
                            channel.streams.filter(s => s.is_active !== false).forEach(stream => {
                                channelsMap.get(channel.id).streams.push({
                                    url: stream.url,
                                    label: stream.label,
                                    userAgent: stream.userAgent,
                                    referer: stream.referer,
                                    origin: stream.origin,
                                    cookie: stream.cookie
                                });
                            });
                        }
                    });
                }

                // Flatten streams to a simple list with channel-aware names
                const streaming_channels = [];
                Array.from(channelsMap.values()).forEach(ch => {
                    ch.streams.forEach(s => {
                        streaming_channels.push({
                            url: s.url,
                            name: s.label ? `${ch.name} - ${s.label}` : ch.name
                        });
                    });
                });

                return {
                    id: match.id,
                    match_id: match.match_id,
                    fixture_date: match.fixture_date,
                    kickoff_time: match.kickoff_time,
                    status: match.status,
                    status_text: match.status_text,
                    home_team: {
                        name: match.home_team_name,
                        logo: match.home_team_logo,
                        goals: match.home_team_goals
                    },
                    away_team: {
                        name: match.away_team_name,
                        logo: match.away_team_logo,
                        goals: match.away_team_goals
                    },
                    competition: {
                        id: match.league_id, // Add league_id to competition
                        name: match.competition_name,
                        logo: match.competition_logo,
                        country: match.competition_country
                    },
                    venue: {
                        name: match.venue_name,
                        city: match.venue_city
                    },
                    referee: match.referee,
                    streaming_channels: streaming_channels
                };
            });
            
            const response = {
                success: true,
                data: {
                    matches: clientMatches,
                    date,
                    total_count: clientMatches.length,
                    has_matches: clientMatches.length > 0
                }
            };
            
            logApiResponse(req, res, response);
            res.json(response);
            
        } catch (error) {
            next(error);
        }
    }
);



// Get all active channels grouped by categories (for live TV browsing)
router.get('/channels', async (req, res, next) => {
    try {
        const categoriesWithChannels = await categoryService.getCategoriesWithChannelsForClient();
        
        // Transform response for client
        const clientCategories = categoriesWithChannels.map(category => ({
            id: category.id,
            name: category.name,
            logo: category.logo_url,
            channels_count: category.channels.length,
            channels: category.channels.map(channel => ({
                id: channel.id,
                name: channel.name,
                logo: channel.logo_url,
                today_matches_count: channel.today_matches_count || 0,
                // Return the primary stream (first active one)
                primary_stream: channel.streams[0] ? {
                    url: channel.streams[0].url,
                    label: channel.streams[0].label,
                    userAgent: channel.streams[0].userAgent,
                    referer: channel.streams[0].referer,
                    origin: channel.streams[0].origin,
                    cookie: channel.streams[0].cookie
                } : null,
                // Return all available streams for quality options
                streams: channel.streams.map(stream => ({
                    url: stream.url,
                    label: stream.label,
                    userAgent: stream.userAgent,
                    referer: stream.referer,
                    origin: stream.origin,
                    cookie: stream.cookie
                }))
            }))
        }));
        
        const totalChannels = clientCategories.reduce((sum, cat) => sum + cat.channels_count, 0);
        
        const response = {
            success: true,
            data: {
                categories: clientCategories,
                total_categories: clientCategories.length,
                total_channels: totalChannels,
                message: totalChannels > 0 ? 
                    `${totalChannels} قناة متاحة في ${clientCategories.length} فئة` : 
                    'لا توجد قنوات متاحة حالياً'
            }
        };
        
        logApiResponse(req, res, response);
        res.json(response);
        
    } catch (error) {
        next(error);
    }
});



export default router;
