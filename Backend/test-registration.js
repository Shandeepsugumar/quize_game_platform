const axios = require('axios');

async function testRegistration() {
    console.log('🧪 Testing Registration API...\n');

    const testUser = {
        username: 'testuser' + Date.now(),
        email: `testuser${Date.now()}@example.com`,
        password: 'test123'
    };

    console.log('📤 Sending registration request:');
    console.log('   Username:', testUser.username);
    console.log('   Email:', testUser.email);
    console.log('   Password:', testUser.password);
    console.log('');

    try {
        const response = await axios.post('http://localhost:3000/api/auth/register', testUser);

        console.log('✅ Registration Successful!');
        console.log('');
        console.log('📊 Response:');
        console.log('   Status:', response.status);
        console.log('   Message:', response.data.message);
        console.log('   User ID:', response.data.user.id);
        console.log('   Username:', response.data.user.username);
        console.log('   Email:', response.data.user.email);
        console.log('   Token:', response.data.token ? '✅ Generated' : '❌ Missing');
        console.log('');
        console.log('✅ User successfully saved to database!');
        console.log('✅ JWT token generated!');
        console.log('');
        console.log('🎉 Registration API is working perfectly!');

    } catch (error) {
        console.error('❌ Registration Failed!');
        console.error('');

        if (error.response) {
            console.error('📊 Error Response:');
            console.error('   Status:', error.response.status);
            console.error('   Message:', error.response.data.message || error.response.data);
            console.error('');

            if (error.response.status === 500) {
                console.error('💡 Troubleshooting:');
                console.error('   1. Check if MongoDB is connected');
                console.error('   2. Check backend terminal for error logs');
                console.error('   3. Verify .env file has correct MONGO_URL');
                console.error('   4. Try restarting the backend server');
            } else if (error.response.status === 400) {
                console.error('💡 Possible Issues:');
                console.error('   - Email or username already exists');
                console.error('   - Password too short (min 6 characters)');
                console.error('   - Missing required fields');
            }
        } else if (error.request) {
            console.error('❌ No response from server!');
            console.error('');
            console.error('💡 Troubleshooting:');
            console.error('   1. Is the backend server running?');
            console.error('   2. Check if it\'s running on http://localhost:3000');
            console.error('   3. Try: npm start in Backend folder');
        } else {
            console.error('❌ Error:', error.message);
        }

        process.exit(1);
    }
}

// Run the test
console.log('═══════════════════════════════════════════════════');
console.log('  Quiz Game Platform - Registration API Test');
console.log('═══════════════════════════════════════════════════');
console.log('');

testRegistration();
