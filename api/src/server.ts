import 'reflect-metadata';
import 'dotenv/config';
import app from './application';
import userRoutes from './controllers/user';
import walletRoutes from './controllers/wallet';
import CronService from './helpers/cron';
import adminRoutes from './routes/admin';
import providerRoutes from './controllers/provider';
import { startRlusdListener } from './services/rlusdListener';
import { AppDataSource } from './data-source';
import { seedCountries } from './seed/countries.seed';

// Register routes
app.use('/user', userRoutes);
app.use('/wallet', walletRoutes);
app.use('/admin', adminRoutes);
app.use('/provider', providerRoutes);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});


const port = parseInt(process.env.PORT || '3000', 10);

async function startServer(): Promise<void> {
    try {
        await AppDataSource.initialize();
        console.log('TypeORM DataSource initialized');
        await seedCountries().catch((err) => console.error('Countries seed error:', err));
        new CronService();
        app.listen(port, '0.0.0.0', () => {
            console.log(`:::::::: Starting the App on ${port} :::::::::::::`);
            startRlusdListener().catch((err) => console.error('[RLUSD listener] start failed:', err));
        });
    } catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
}

startServer();
