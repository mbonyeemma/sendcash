import dotenv from 'dotenv';

dotenv.config();
const config = {
    // Database
    dbUser: process.env.DB_USER || 'root',
    dbHost: process.env.DB_HOST || 'localhost',
    dbName: process.env.DB_NAME || 'siabet',
    dbPassword: process.env.DB_PASSWORD || '',
    dbPort: parseInt(process.env.DB_PORT || '3306', 10),
    dbSsl: process.env.DB_SSL === 'true',
    GOOGLE_CLIENT_ID: '10349883522-hf77q9tpsqv631fuja0i7uun86j8tij5.apps.googleusercontent.com',
    // JWT
    secretKey: process.env.JWT_SECRET || 'your-secret-key',
    
    // Firebase Cloud Messaging
    fcmProjectId: process.env.FCM_PROJECT_ID || '',
    fcmClientEmail: process.env.FCM_CLIENT_EMAIL || '',
    fcmPrivateKey: process.env.FCM_PRIVATE_KEY || '',

    // Stellar
    betTokenIssuer: process.env.BET_TOKEN_ISSUER || '',
    escrowAccount: process.env.ESCROW_ACCOUNT || '',
    airdropSecret: process.env.AIRDROP_SECRET || '',
    startBalance: process.env.STELLAR_START_BALANCE || '1',
    startBonusAmount: process.env.STELLAR_START_BONUS_AMOUNT || '10',
    
    // App
    avatarUrl: process.env.AVATAR_URL || 'https://example.com/avatars/',
    betToken: process.env.BET_TOKEN || 'UGX',
    
    // Sports API
    oddsApiKey: process.env.ODDS_API_KEY || '',

    // Binance Smart Chain USDC validation
    bscUsdcContract:"0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"
 };

export default config; 