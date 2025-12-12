const mongoose = require('mongoose');
require('dotenv').config();

// Test MongoDB Connection and User Model
async function testDatabaseConnection() {
    try {
        console.log('🔌 Testing MongoDB connection...');
        console.log('📍 MongoDB URL:', process.env.MONGO_URL ? '✅ Found' : '❌ Not found');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Successfully connected to MongoDB!');

        // Import User model
        const User = require('./models/User');

        // Count users
        const userCount = await User.countDocuments();
        console.log(`\n📊 Database Statistics:`);
        console.log(`   Total users: ${userCount}`);

        // Find Google OAuth users
        const googleUsers = await User.countDocuments({ googleId: { $exists: true, $ne: null } });
        console.log(`   Google OAuth users: ${googleUsers}`);

        // Find regular users
        const regularUsers = await User.countDocuments({ googleId: { $exists: false } });
        console.log(`   Regular users: ${regularUsers}`);

        // Show recent users
        if (userCount > 0) {
            console.log(`\n👥 Recent Users (last 5):`);
            const recentUsers = await User.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('username email googleId createdAt');

            recentUsers.forEach((user, index) => {
                console.log(`\n   ${index + 1}. ${user.username}`);
                console.log(`      Email: ${user.email}`);
                console.log(`      Type: ${user.googleId ? 'Google OAuth' : 'Regular'}`);
                console.log(`      Created: ${user.createdAt.toLocaleString()}`);
            });
        }

        console.log('\n✅ Database test completed successfully!');

    } catch (error) {
        console.error('\n❌ Database test failed:');
        console.error('Error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check if MongoDB URL is correct in .env file');
        console.error('2. Ensure MongoDB Atlas allows connections from your IP');
        console.error('3. Verify database credentials are correct');
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the test
testDatabaseConnection();
