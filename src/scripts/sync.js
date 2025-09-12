import mongoose from 'mongoose';
import connectDatabase from '../config/database.js';
import syncService from '../services/syncService.js';

const runSync = async () => {
    console.log('🔄 Starting manual sync...');
    
    try {
        await connectDatabase();
        const result = await syncService.syncMatches();
        
        if (result.success) {
            console.log('✅ Sync completed successfully!');
            console.log('Stats:', result.stats);
        } else {
            console.error('❌ Sync failed:', result.message);
            if (result.error) {
                console.error('Error details:', result.error);
            }
        }
    } catch (error) {
        console.error('❌ Sync script uncaught error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed.');
    }
};

runSync();