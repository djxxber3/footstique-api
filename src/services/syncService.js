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
        this.schedulerEnabled = false;
        this.nextRun = null;
        this.totalRuns = 0;
        this.lastError = null;
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
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return [yesterday, today, tomorrow].map(d => d.toISOString().slice(0, 10));
    }

    async syncMatches() {
        if (this.isRunning) {
            console.log('Sync is already running...');
            return { success: false, message: 'Sync is already running' };
        }
        
        this.isRunning = true;
        const startTime = Date.now();
        this.totalRuns += 1;
        
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
            this.lastError = null;
            console.log(`✅ Sync completed in ${duration}ms`);
            
        } catch (error) {
            console.error('❌ Sync failed:', error.message);
            if (log) {
                log.status = 'failed';
                log.error_message = error.message;
                await log.save();
            }
            this.lastSyncStatus = { success: false, message: 'Sync failed', error: error.message };
            this.lastError = error.message;
        } finally {
            this.isRunning = false;
        }
        return this.lastSyncStatus;
    }
    
    getSyncStatus() {
        return {
            isRunning: this.isRunning,
            lastSync: this.lastSyncStatus,
            isScheduled: this.schedulerEnabled,
            nextRun: this.nextRun,
            totalRuns: this.totalRuns,
            lastError: this.lastError
        };
    }
    
    async getSyncHistory(limit = 10) {
        return await SyncLog.find().sort({ started_at: -1 }).limit(limit);
    }

    async getLastSyncDate() {
        const setting = await AppSetting.findOne({ key_name: 'last_sync_date' });
        return setting ? setting.key_value : null;
    }

    // Scheduler utilities
    updateSchedulerStatus(enabled, hour, minute, timezone = 'Africa/Algiers') {
        this.schedulerEnabled = !!enabled;
        if (enabled) {
            this.nextRun = this.computeNextRunDate(hour, minute, timezone);
        } else {
            this.nextRun = null;
        }
    }

    computeNextRunDate(hour, minute, timezone = 'Africa/Algiers') {
        try {
            const now = new Date();
            // Get current date parts in target timezone
            const fmt = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric', month: '2-digit', day: '2-digit'
            });
            const [{ value: y }, , { value: m }, , { value: d }] = fmt.formatToParts(now);
            const targetLocal = new Date(`${y}-${m}-${d}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
            // Convert the intended local time in the target timezone to UTC timestamp via offset diff
            const tzNowParts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(now);
            // Fallback: compare using formatted times to decide if passed
            const hasPassed = (() => {
                const nowHour = parseInt(tzNowParts.find(p => p.type === 'hour')?.value || '0', 10);
                const nowMinute = parseInt(tzNowParts.find(p => p.type === 'minute')?.value || '0', 10);
                if (nowHour > hour) return true;
                if (nowHour < hour) return false;
                return nowMinute >= minute;
            })();
            if (hasPassed) {
                // Add one day in target timezone
                const dateInTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
                dateInTz.setDate(dateInTz.getDate() + 1);
                const y2 = dateInTz.getFullYear();
                const m2 = String(dateInTz.getMonth() + 1).padStart(2, '0');
                const d2 = String(dateInTz.getDate()).padStart(2, '0');
                return new Date(`${y2}-${m2}-${d2}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
            }
            return targetLocal;
        } catch (e) {
            return null;
        }
    }
}

const syncService = new SyncService();
export const startDailySync = async () => await syncService.syncMatches();
export default syncService;
