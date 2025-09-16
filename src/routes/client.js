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


router.get('/matches/:date',
    validate(schemas.dateParam, 'params'),
    async (req, res, next) => {
        try {
            const { date } = req.params;
            
            const matches = await matchService.getAllMatches(date);
            
            const clientMatches = matches.map(match => {
                
                const streaming_channels = (match.channels || [])
                    .map(channel => {
                        const activeStreams = (channel.streams || []).filter(s => s.is_active);
                        
                        if (activeStreams.length === 0) {
                            return null;
                        }

                        return {
                            id: channel.id,
                            name: channel.name,
                            logo_url: channel.logo_url,
                            streams: activeStreams.map(s => ({
                                id: s.id,
                                url: s.url,
                                label: s.label,
                                userAgent: s.userAgent,
                                referer: s.referer,
                                origin: s.origin,
                                cookie: s.cookie
                            }))
                        };
                    })
                    .filter(Boolean);

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
                        id: match.league_id,
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
                primary_stream: channel.streams[0] ? (() => {
                    const s = channel.streams[0];
                    const obj = { url: s.url, label: s.label };
                    if (s.userAgent && String(s.userAgent).trim()) obj.userAgent = s.userAgent;
                    if (s.referer && String(s.referer).trim()) obj.referer = s.referer;
                    if (s.origin && String(s.origin).trim()) obj.origin = s.origin;
                    if (s.cookie && String(s.cookie).trim()) obj.cookie = s.cookie;
                    return obj;
                })() : null,
                // Return all available streams for quality options
                streams: channel.streams.map(stream => {
                    const obj = { url: stream.url, label: stream.label };
                    if (stream.userAgent && String(stream.userAgent).trim()) obj.userAgent = stream.userAgent;
                    if (stream.referer && String(stream.referer).trim()) obj.referer = stream.referer;
                    if (stream.origin && String(stream.origin).trim()) obj.origin = stream.origin;
                    if (stream.cookie && String(stream.cookie).trim()) obj.cookie = stream.cookie;
                    return obj;
                })
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
