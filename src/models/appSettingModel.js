import mongoose from 'mongoose';

const appSettingSchema = new mongoose.Schema({
    key_name: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    key_value: {
        type: mongoose.Schema.Types.Mixed,
    },
    description: String,
}, {
    timestamps: true
});

const AppSetting = mongoose.model('AppSetting', appSettingSchema);
export default AppSetting;