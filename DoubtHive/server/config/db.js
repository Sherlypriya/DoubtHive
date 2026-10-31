const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('\n==================== MONGO_URI NOT CONFIGURED ====================');
    console.error('The MONGO_URI environment variable is missing.');
    console.error('Please configure MONGO_URI in your environment or server/.env file.');
    console.error('Example: mongodb+srv://<user>:<password>@cluster.mongodb.net/doubthive');
    console.error('===================================================================\n');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // fail fast instead of hanging ~30s
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // Safely mask credentials in log output
    const safeUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//*redacted*@');
    console.error('\n==================== DATABASE NOT REACHABLE ====================');
    console.error(`Could not connect to MongoDB at: ${safeUri}`);
    console.error(`Reason: ${error.message}\n`);
    console.error('The API cannot work without a database connection.');
    console.error('Check:');
    console.error('  • Network Access (Atlas IP Whitelist: allow 0.0.0.0/0 or Render IPs)');
    console.error('  • Database User credentials and permissions in MongoDB Atlas');
    console.error('  • Database name in connection string (/doubthive)');
    console.error('================================================================\n');
    process.exit(1);
  }
};

module.exports = connectDB;

