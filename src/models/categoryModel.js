import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    logo_url: {
        type: String,
        trim: true,
    },
    sort_order: {
        type: Number,
        default: 0,
    },
    is_active: {
        type: Boolean,
        default: true,
    },
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

// Virtual for channels (can be populated later)
categorySchema.virtual('channels', {
    ref: 'Channel',
    localField: '_id',
    foreignField: 'category'
});

const Category = mongoose.model('Category', categorySchema);
export default Category;