import fetch from 'node-fetch';
import SyncLog from '../models/syncLogModel.js';
import AppSetting from '../models/appSettingModel.js';
import { SUPPORTED_LEAGUES, API_CONFIG } from '../config/constants.js';
import { ExternalAPIError } from '../middleware/errorHandler.js';
import matchService from './matchService.js';

class SyncService {
    
    constructor() {
        this.isRunning = false;
        this.lastSyncStatus = null;
    }
    
    async makeApiRequest(url, retryCount = 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            
            const response = await fetch(url, {
                headers: { 'x-apisports-key': API_CONFIG.KEY },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.errors && Object.keys(data.errors).length > 0) {
                console.warn('API returned errors:', data.errors);
            }
            
            return data.response || [];
            
        } catch (error) {
            if (retryCount < API_CONFIG.MAX_RETRIES - 1) {
                const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`Request failed, retrying in ${delay}ms... (${retryCount + 1}/${API_CONFIG.MAX_RETRIES})`);
                await this.delay(delay);
                return this.makeApiRequest(url, retryCount + 1);
            }
            
            console.error(`API request failed after ${API_CONFIG.MAX_RETRIES} retries:`, error.message);
            throw new ExternalAPIError(`Failed to fetch data from API: ${error.message}`);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    transformFixtureData(fixture) {
        try {
            const { fixture: fixtureData, teams, goals, league } = fixture;
            
            if (!fixtureData?.id || !fixtureData?.date || !teams?.home?.name || !teams?.away?.name || !league?.name) {
                return null;
            }
            
            return {
                match_id: fixtureData.id.toString(),
                external_id: fixtureData.id,
                league_id: league.id, // Add league_id
                fixture_date: new Date(fixtureData.date).toISOString().slice(0, 10),
                kickoff_time: new Date(fixtureData.date),
                status: fixtureData.status?.short || 'NS',
                status_text: fixtureData.status?.long || 'Not Started',
                home_team_name: teams.home.name,
                home_team_logo: teams.home.logo,
                home_team_goals: goals?.home,
                away_team_name: teams.away.name,
                away_team_logo: teams.away.logo,
                away_team_goals: goals?.away,
                competition_name: league.name,
                competition_logo: league.logo,
                competition_country: league.country,
                venue_name: fixtureData.venue?.name,
                venue_city: fixtureData.venue?.city,
                referee: fixtureData.referee
            };
        } catch (error) {
            console.error(`Failed to transform fixture ${fixture?.fixture?.id}:`, error.message);
            return null;
        }
    }

    async fetchMatchesByDate(date) {
        const url = `${API_CONFIG.BASE_URL}/fixtures?date=${date}`;
        console.log(`Fetching matches for ${date}...`);
        
        const fixtures = await this.makeApiRequest(url);
        
        if (!Array.isArray(fixtures)) {
            console.warn(`No fixtures data received for ${date}`);
            return [];
        }
        
        const validMatches = fixtures
            .filter(fixture => fixture?.league?.id && SUPPORTED_LEAGUES.includes(fixture.league.id))
            .map(fixture => this.transformFixtureData(fixture))
            .filter(match => match !== null);
        
        console.log(`Found ${validMatches.length} valid matches for ${date}`);
        return validMatches;
    }
    
    async getSmartSyncDates() {
        const today = new Date();
        const dates = [];

        // 1) Always include yesterday to update final results
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        dates.push(yesterday.toISOString().slice(0, 10));

        // 2) Check today + next 6 days; fetch only if day missing in DB
        for (let i = 0; i <= 6; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const has = await matchService.hasMatchesForDate(dateStr);
            if (!has) {
                dates.push(dateStr);
            }
        }

        return dates;
    }

    async syncMatches() {
        if (this.isRunning) {
            console.log('Sync is already running...');
            return { success: false, message: 'Sync is already running' };
        }
        
        this.isRunning = true;
        const startTime = Date.now();
        
        let log;
        try {
            log = await SyncLog.create({ sync_date: new Date(), status: 'running' });
            console.log('🔄 Starting matches synchronization...');
            
            const syncDates = await this.getSmartSyncDates();
            
            const allMatches = [];
            for (const date of syncDates) {
                const matches = await this.fetchMatchesByDate(date);
                allMatches.push(...matches);
                if (syncDates.indexOf(date) < syncDates.length - 1) {
                    await this.delay(API_CONFIG.RATE_LIMIT_DELAY);
                }
            }
            
            log.matches_fetched = allMatches.length;
            
            const upsertResults = await matchService.bulkUpsertMatches(allMatches);
            log.matches_inserted = upsertResults.inserted;
            log.matches_updated = upsertResults.updated;

            log.status = 'completed';
            await log.save();
            
            await AppSetting.updateOne(
                { key_name: 'last_sync_date' },
                { $set: { key_value: new Date().toISOString() } },
                { upsert: true }
            );
            
            const duration = Date.now() - startTime;
            this.lastSyncStatus = {
                success: true,
                message: `Sync completed successfully`,
                stats: {
                    duration: `${duration}ms`,
                    matches_fetched: log.matches_fetched,
                    matches_inserted: log.matches_inserted,
                    matches_updated: log.matches_updated,
                }
            };
            console.log(`✅ Sync completed in ${duration}ms`);
            
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
            if (log) {
                log.status = 'failed';
                log.error_message = error.message;
                await log.save();
            }
            this.lastSyncStatus = { success: false, message: 'Sync failed', error: error.message };
        } finally {
            this.isRunning = false;
        }
        return this.lastSyncStatus;
    }
    
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSync: this.lastSyncStatus
        };
    }
    
    async getSyncHistory(limit = 10) {
        return await SyncLog.find().sort({ started_at: -1 }).limit(limit);
    }

    async getLastSyncDate() {
        const setting = await AppSetting.findOne({ key_name: 'last_sync_date' });
        return setting ? setting.key_value : null;
    }
}

const syncService = new SyncService();
export const startDailySync = async () => await syncService.syncMatches();
export default syncService;
