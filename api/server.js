
require('dotenv').config();
const app = require('./application');
const betRoutes = require('./controllers/bets');
const userRoutes = require('./controllers/user');
const walletRoutes = require('./controllers/wallet');
const { Database } = require('./libs/database');

// Register routes
app.use('/', userRoutes);
app.use('/bet', betRoutes);
app.use('/wallet', walletRoutes);

const port = process.env.PORT || 3000;

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

async function startServer() {
    try {
        // Test database connection
        await Database.selectQuery('SELECT 1');
        console.log('Database connection has been established successfully.');
        
        app.listen(port, '0.0.0.0', () => {
            console.log(`:::::::: Starting the SIABET on ${port} :::::::::::::`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
