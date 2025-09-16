import Match from '../models/matchModel.js';
import Channel from '../models/channelModel.js';
import { NotFoundError } from '../middleware/errorHandler.js';

class MatchService {

  async getMatchesByDate(date, populateActiveOnly = true) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const channelPopulation = {
        path: 'channels',
        populate: { 
            path: 'streams',
            options: { sort: { sort_order: 1 }}
        }
    };

    if (populateActiveOnly) {
        channelPopulation.match = { is_active: true };
        channelPopulation.populate.match = { is_active: true };
    }

    return await Match.find({ fixture_date: { $gte: startOfDay, $lte: endOfDay } })
        .populate(channelPopulation)
        .sort({ league_id: 1, kickoff_time: 1 });
}

    async getMatchesWithChannels(date) {
        const matches = await this.getMatchesByDate(date, true);
        return matches.filter(match => 
            match.channels.length > 0 && match.channels.some(c => c.streams && c.streams.length > 0)
        );
    }
    
    async getAllMatches(date) {
        return await this.getMatchesByDate(date, false);
    }

    async hasMatchesForDate(date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        const exists = await Match.exists({ fixture_date: { $gte: startOfDay, $lte: endOfDay } });
        return !!exists;
    }
    
    async getMatchById(match_id) {
        const match = await Match.findOne({ match_id }).populate({
            path: 'channels',
            populate: { 
                path: 'streams',
                options: { sort: { sort_order: 1 }}
            }
        });
        
        if (!match) {
            throw new NotFoundError('Match not found');
        }
        return match;
    }

    async linkChannelsToMatch(match_id, channelIds) {
        const match = await Match.findOne({ match_id });
        if (!match) {
            throw new NotFoundError('Match not found');
        }

        if (channelIds.length > 0) {
            const channels = await Channel.find({ '_id': { $in: channelIds } });
            if (channels.length !== channelIds.length) {
                const foundIds = channels.map(c => c._id.toString());
                const notFound = channelIds.filter(id => !foundIds.includes(id));
                throw new NotFoundError(`Channels not found: ${notFound.join(', ')}`);
            }
        }
        
        match.channels = channelIds;
        await match.save();

        return this.getMatchById(match_id);
    }

    async bulkUpsertMatches(matchesData) {
        if (!matchesData || matchesData.length === 0) {
            return { success: true, inserted: 0, updated: 0 };
        }
        const bulkOps = matchesData.map(matchData => ({
            updateOne: {
                filter: { match_id: matchData.match_id },
                update: { $set: matchData },
                upsert: true
            }
        }));

        const result = await Match.bulkWrite(bulkOps);
        return {
            success: true,
            inserted: result.upsertedCount,
            updated: result.modifiedCount
        };
    }
    
    async getMatchesStats(date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const dateFilter = { fixture_date: { $gte: startOfDay, $lte: endOfDay } };

        const total_matches = await Match.countDocuments(dateFilter);
        const matches_with_channels = await Match.countDocuments({ ...dateFilter, 'channels.0': { $exists: true } });
        const competitions = await Match.distinct('competition_name', dateFilter);

        return {
            total_matches,
            matches_with_channels,
            matches_without_channels: total_matches - matches_with_channels,
            total_competitions: competitions.length
        };
    }
}

export default new MatchService();
