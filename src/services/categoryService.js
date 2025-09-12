import Category from '../models/categoryModel.js';
import Channel from '../models/channelModel.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

class CategoryService {

    async getAllCategories(includeInactive = false) {
        const filter = includeInactive ? {} : { is_active: true };
        const categories = await Category.aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: Channel.collection.name,
                    localField: '_id',
                    foreignField: 'category',
                    as: 'channels'
                }
            },
            {
                $addFields: {
                    id: '$_id',
                    channels_count: { $size: '$channels' },
                    active_channels_count: {
                        $size: {
                            $filter: {
                                input: '$channels',
                                as: 'channel',
                                cond: { $eq: ['$$channel.is_active', true] }
                            }
                        }
                    }
                }
            },
            { $project: { channels: 0, _id: 0, __v: 0 } },
            { $sort: { sort_order: 1, name: 1 } }
        ]);
        return categories;
    }

    async getCategoryById(id) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new NotFoundError('Invalid Category ID format');
        }
        const category = await Category.findById(id);
        if (!category) {
            throw new NotFoundError('Category not found');
        }
        return category;
    }

    async getCategoriesWithChannelsForClient() {
        const categories = await Category.find({ is_active: true })
            .populate({
                path: 'channels',
                match: { is_active: true, 'streams.0': { $exists: true } },
                options: { sort: { sort_order: 1, name: 1 } }
            })
            .sort({ sort_order: 1, name: 1 });

        // Keep only active streams per channel
        const filtered = categories.map(cat => {
            const ch = (cat.channels || []).map(c => ({
                ...c.toObject(),
                streams: (c.streams || []).filter(s => s.is_active)
            })).filter(c => c.streams && c.streams.length > 0);
            return { ...cat.toObject(), channels: ch };
        });

        return filtered.filter(cat => cat.channels && cat.channels.length > 0);
    }

    async createCategory(categoryData) {
        const existingCategory = await Category.findOne({ name: categoryData.name });
        if (existingCategory) {
            throw new ConflictError('Category with this name already exists');
        }
        const newCategory = new Category(categoryData);
        await newCategory.save();
        return newCategory;
    }

    async updateCategory(id, updateData) {
        await this.getCategoryById(id);

        if (updateData.name) {
            const existing = await Category.findOne({ _id: { $ne: id }, name: updateData.name });
            if (existing) {
                throw new ConflictError('Category with this name already exists');
            }
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });
        return updatedCategory;
    }

    async deleteCategory(id) {
        await this.getCategoryById(id);
        // Set category to null for all channels in this category
        await Channel.updateMany({ category: id }, { $set: { category: null } });
        await Category.findByIdAndDelete(id);
        return { success: true, message: 'Category deleted successfully. Associated channels are now uncategorized.' };
    }

    async toggleCategoryStatus(id, isActive) {
        await this.getCategoryById(id);
        return await Category.findByIdAndUpdate(id, { is_active: isActive }, { new: true });
    }
    
    async getCategoryStats() {
        const total_categories = await Category.countDocuments();
        const active_categories = await Category.countDocuments({ is_active: true });
        const categorized_channels = await Channel.countDocuments({ category: { $ne: null } });
        const uncategorized_channels = await Channel.countDocuments({ category: null });

        return {
            total_categories,
            active_categories,
            inactive_categories: total_categories - active_categories,
            categorized_channels,
            uncategorized_channels
        };
    }
}

export default new CategoryService();