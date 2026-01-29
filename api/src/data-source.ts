import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './entities/User.entity';
import { Transaction } from './entities/Transaction.entity';
import { Wallet } from './entities/Wallet.entity';
import { OTP } from './entities/OTP.entity';
import { Notification } from './entities/Notification.entity';
import { Fee } from './entities/Fee.entity';
import { Country } from './entities/Country.entity';
import { AdminUser } from './entities/AdminUser.entity';
import { AuthToken } from './entities/AuthToken.entity';
import { ExchangeRate } from './entities/ExchangeRate.entity';
import { Chain } from './entities/Chain.entity';
import { ServiceCategory } from './entities/ServiceCategory.entity';
import { Biller } from './entities/Biller.entity';
import { BillerCategory } from './entities/BillerCategory.entity';
import { BillerCategoryItem } from './entities/BillerCategoryItem.entity';
import { PaymentMethod } from './entities/PaymentMethod.entity';
import { PaymentType } from './entities/PaymentType.entity';
import { ChannelAccount } from './entities/ChannelAccount.entity';
import { BlockchainTransaction } from './entities/BlockchainTransaction.entity';
import { SiaDepositTransaction } from './entities/SiaDepositTransaction.entity';
import { SiaTransaction } from './entities/SiaTransaction.entity';
import { SiaTrLog } from './entities/SiaTrLog.entity';
import { SupportedAsset } from './entities/SupportedAsset.entity';
import { SweepTransaction } from './entities/SweepTransaction.entity';
import { ThirdpartyLog } from './entities/ThirdpartyLog.entity';
import { UserBlockchainAddress } from './entities/UserBlockchainAddress.entity';
import { UserReferral } from './entities/UserReferral.entity';
import { UserReferralStat } from './entities/UserReferralStat.entity';
import { WebhookLog } from './entities/WebhookLog.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kitipay',
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    User,
    Transaction,
    Wallet,
    OTP,
    Notification,
    Fee,
    Country,
    AdminUser,
    AuthToken,
    ExchangeRate,
    Chain,
    ServiceCategory,
    Biller,
    BillerCategory,
    BillerCategoryItem,
    PaymentMethod,
    PaymentType,
    ChannelAccount,
    BlockchainTransaction,
    SiaDepositTransaction,
    SiaTransaction,
    SiaTrLog,
    SupportedAsset,
    SweepTransaction,
    ThirdpartyLog,
    UserBlockchainAddress,
    UserReferral,
    UserReferralStat,
    WebhookLog,
  ],
  migrations: [],
  subscribers: [],
});
