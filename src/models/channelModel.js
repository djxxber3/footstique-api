import mongoose from 'mongoose';

const streamSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
        trim: true,
    },
    label: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
    },
    referer: {
        type: String,
        trim: true,
    },
    origin: {
        type: String,
        trim: true,
    },
    cookie: {
        type: String,
        trim: true,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    sort_order: {
        type: Number,
        default: 0,
    },
}, {
    _id: true,
    toJSON: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    },
    toObject: {
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    }
});

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
unique:true,                trim: true,
    },
    logo_url: {
        type: String,
        trim: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
    sort_order: {
        type: Number,
        default: 0,
    },
    streams: [streamSchema],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    },
    toObject: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

const Channel = mongoose.model('Channel', channelSchema);
export default Channel;
