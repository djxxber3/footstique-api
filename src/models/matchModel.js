import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    match_id: { // The unique ID from the external API
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    external_id: { // Just in case, keeping the numeric ID
        type: Number,
        required: true,
    },
    league_id: {
        type: Number,
        index: true,
    },
    fixture_date: {
        type: Date,
        required: true,
        index: true,
    },
    kickoff_time: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        default: 'NS',
    },
    status_text: {
        type: String,
        default: 'Not Started',
    },
    home_team_name: String,
    home_team_logo: String,
    home_team_goals: Number,
    away_team_name: String,
    away_team_logo: String,
    away_team_goals: Number,
    competition_name: String,
    competition_logo: String,
    competition_country: String,
    venue_name: String,
    venue_city: String,
    referee: String,
    channels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    }],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
