import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
    sync_date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['running', 'completed', 'failed'],
        default: 'running',
    },
    matches_fetched: {
        type: Number,
        default: 0,
    },
    matches_updated: {
        type: Number,
        default: 0,
    },
    matches_inserted: {
        type: Number,
        default: 0,
    },
    error_message: String,
}, {
    timestamps: { createdAt: 'started_at', updatedAt: 'completed_at' }
});

const SyncLog = mongoose.model('SyncLog', syncLogSchema);
export default SyncLog;