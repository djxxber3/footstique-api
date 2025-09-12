import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDatabase = async () => {
    if (mongoose.connections[0].readyState) {
        // Use current db connection
        return;
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1); // Exit process with failure
    }
};

export default connectDatabase;