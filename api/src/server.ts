import 'dotenv/config';
import app from './application';
import betRoutes from './controllers/bets';
import userRoutes from './controllers/user';
import walletRoutes from './controllers/wallet';
import groupRoutes from './controllers/groups';
import chatRoutes from './controllers/chat';
import earnRoutes from './controllers/earn';
import CronService from './helpers/cron';
import indexTest from './tests/index';
import paymentRoutes from './controllers/payment';
import adminRoutes from './routes/admin';
// Initialize test function
(async () => {
  try {
    // Run the test function in background
    indexTest.main().catch(err => console.error('Test error:', err));
  } catch (error) {
    console.error('Error running test:', error);
  }
})();

// Register routes
app.use('/user', userRoutes);
app.use('/bet', betRoutes);
app.use('/wallet', walletRoutes);
app.use('/group', groupRoutes);
app.use('/payment', paymentRoutes);
app.use('/chat', chatRoutes);
app.use('/earn', earnRoutes);
app.use('/admin', adminRoutes);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});


const port = parseInt(process.env.PORT || '3000', 10);

async function startServer(): Promise<void> {
    try {
        // Test database connection
        new CronService();
        app.listen(port, '0.0.0.0', () => {
            console.log(`:::::::: Starting the App on ${port} :::::::::::::`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
