import Channel from '../models/channelModel.js';
import Match from '../models/matchModel.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

class ChannelService {



async getAllChannels(includeInactive = false) {
    const filter = includeInactive ? {} : { is_active: true };
    const channels = await Channel.find(filter)
        .populate('category', 'name sort_order')
        .sort({ sort_order: 1, name: 1 });
        
    // Manually sort by category sort_order if populated
    return channels.sort((a, b) => {
        const sortA = a.category ? a.category.sort_order : 999;
        const sortB = b.category ? b.category.sort_order : 999;
        if (sortA !== sortB) {
            return sortA - sortB;
        }
        return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
    });
}


    
    
    async getChannelById(id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new NotFoundError('Invalid Channel ID format');
        }
        const channel = await Channel.findById(id).populate('category', 'name');
        if (!channel) {
            throw new NotFoundError('Channel not found');
        }
        return channel;
    }

    async createChannel(channelData) {
        const existingChannel = await Channel.findOne({ name: channelData.name });
        if (existingChannel) {
            throw new ConflictError('Channel with this name already exists');
        }

        const newChannel = new Channel({
            name: channelData.name,
            logo_url: channelData.logo_url,
            category: channelData.category_id || null,
            sort_order: channelData.sort_order,
            streams: channelData.streams
        });

        await newChannel.save();
        return this.getChannelById(newChannel._id);
    }

    


async updateChannel(id, updateData) {
    const channel = await this.getChannelById(id);

    if (updateData.name) {
        const existing = await Channel.findOne({ name: updateData.name, _id: { $ne: id } });
        if (existing) {
            throw new ConflictError('Channel with this name already exists');
        }
        // تحديث الحقل مباشرة على المستند
        channel.name = updateData.name;
    }
    
    // تحديث الحقول الأخرى إذا كانت موجودة
    if (updateData.logo_url !== undefined) {
        channel.logo_url = updateData.logo_url;
    }
    if (updateData.is_active !== undefined) {
        channel.is_active = updateData.is_active;
    }
    if (updateData.sort_order !== undefined) {
        channel.sort_order = updateData.sort_order;
    }
    if (updateData.category_id !== undefined) {
        channel.category = updateData.category_id || null;
    }

    // **المنطق المصحح: تحديث مصفوفة 'streams' مباشرة**
    if (updateData.streams) {
        // استبدال مصفوفة الروابط القديمة بالجديدة
        channel.streams = updateData.streams;
    }
    
    // حفظ التغييرات على المستند في قاعدة البيانات
    await channel.save();

    // إرجاع القناة المحدثة مع بيانات الفئة
    return this.getChannelById(id);
}

    


    async deleteChannel(id) {
        await this.getChannelById(id);
        // Remove this channel from all matches that link to it
        await Match.updateMany({}, { $pull: { channels: id } });
        await Channel.findByIdAndDelete(id);
        return { success: true, message: 'Channel and all associated links have been deleted successfully.' };
    }

    async deactivateChannel(id) {
        return await Channel.findByIdAndUpdate(id, { is_active: false }, { new: true });
    }

    async activateChannel(id) {
        return await Channel.findByIdAndUpdate(id, { is_active: true }, { new: true });
    }

    async unlinkAllMatches(channelId) {
        await this.getChannelById(channelId);
        await Match.updateMany({ channels: channelId }, { $pull: { channels: channelId } });
        return { success: true, message: 'All matches unlinked from channel successfully' };
    }
    
    async getChannelsWithStats() {
        // Using aggregation for better performance
        const todayStart = new Date();
        todayStart.setUTCHours(0,0,0,0);
        const todayEnd = new Date();
        todayEnd.setUTCHours(23,59,59,999);

        const channels = await Channel.aggregate([
            { $match: { is_active: true } },
            {
                $lookup: {
                    from: 'matches',
                    let: { channelId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $in: ['$$channelId', '$channels'] } } },
                        { $group: {
                            _id: null,
                            total: { $sum: 1 },
                            today: {
                                $sum: {
                                    $cond: [ { $and: [ { $gte: ['$fixture_date', todayStart] }, { $lte: ['$fixture_date', todayEnd] } ] }, 1, 0 ]
                                }
                            }
                        }}
                    ],
                    as: 'match_stats'
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1, name: 1, logo_url: 1, streams: 1, sort_order: 1, is_active: 1,
                    category_name: '$categoryInfo.name',
                    category_sort_order: '$categoryInfo.sort_order',
                    matches_count: { $ifNull: [ { $arrayElemAt: ['$match_stats.total', 0] }, 0 ] },
                    today_matches_count: { $ifNull: [ { $arrayElemAt: ['$match_stats.today', 0] }, 0 ] }
                }
            }
        ]);
        
        return channels.map(c => ({...c, id: c._id})).sort((a,b) => {
            const sortA = a.category_sort_order ?? 999;
            const sortB = b.category_sort_order ?? 999;
            if (sortA !== sortB) return sortA - sortB;
            return a.sort_order - b.sort_order;
        });
    }

    async getChannelStats() {
        const total_channels = await Channel.countDocuments();
        const active_channels = await Channel.countDocuments({ is_active: true });
        const streams = await Channel.aggregate([
            { $unwind: '$streams' },
            { $match: { 'streams.is_active': true } },
            { $count: 'total_streams' }
        ]);

        return {
            total_channels,
            active_channels,
            inactive_channels: total_channels - active_channels,
            total_streams: streams.length > 0 ? streams[0].total_streams : 0
        };
    }
}

export default new ChannelService();
