import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Database from './database';
import config from '../config';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { sendNotification } from '../helpers/FCM';
import { Stellar } from './Stellar';
import { Encryption } from './encryption';
import BaseModel from './database';
import { Recipient, Stellar as Stellar2 } from './Stellar';
import crypto from 'crypto';
import { sendEmail } from '../helpers/email';
import SMSHelper from '../helpers/SMSHelper';

export const messageTypes = {
    "GENERAL_DEBIT": "Your KITI PAY wallet has been debited with {amount} {currency} via {payment_mode} to {username}, with a fee of {fee}. Date: {date}",
    "GENERAL_CREDIT": "Your KITI PAY wallet has been credited with {amount} {currency} via {payment_mode} from {username}, with a fee of {fee}. Date: {date}"
}


interface UserRecord {
    user_id: number;
    username: string;
    email: string;
    password: string;
    avatar: string;
    fcm: string;
    validator: boolean;
    created_at: Date;
    public_key?: string;
}

interface JwtPayload {
    username: string;
    [key: string]: any;
}

export interface BaseRecord {
    id?: string;
    user_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

// Add wallet interface
interface WalletRecord {
    id?: string;
    user_id: string;
    chain: string;
    publicKey: string;
    secret: string;
    mnemonic?: string;
    created_at?: Date;
}

export default class Modal extends BaseModel {
    logOperation(operation: string, reference: string, accountNo: string, ref: string = '', payload: any = {}) {
        const logData = {
            operation,
            reference,
            accountNo,
            ref,
            payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
        };
        this.insertData("thirdparty_logs", logData);
    }
    

    constructor() {
        super();
    }
    async getFollowers(userId: string) {
        return this.callQuery(`SELECT * FROM followers WHERE follow_user_id = '${userId}'`);
    }

    async getFollowing(userId: string) {
        return this.callQuery(`SELECT * FROM followers WHERE user_id = '${userId}'`);
    }

    async getPlayed(userId: string) {
        return this.callQuery(`SELECT * FROM bets WHERE user_id = '${userId}'`);
    }

    async getWon(userId: string) {
        return await this.callQuery(`SELECT * FROM bets WHERE winner_id = '${userId}'`);
    }

 
    async getUser(username: string) {
        const users: any = await this.callQuery(`SELECT * FROM sia_users WHERE username = '${username}'`);
        return users.length > 0 ? users[0] : null;
    }
    async getUserInformation(userId: string) {
        const users: any = await this.callQuery(`SELECT username,full_name,phone_number,avatar,user_id FROM sia_users WHERE user_id = '${userId}' OR username = '${userId}'`);
        return users.length > 0 ? users[0] : null;
    }
    async getUserById(userId: string) {
        const users: any = await this.callQuery(`SELECT * FROM sia_users WHERE user_id = '${userId}' OR username = '${userId}'`);
        return users.length > 0 ? users[0] : null;
    }

    async saveNotification(userId: string, message_type: string, title: string, message: string) {
        const notificationData = {
            user_id: userId,
            message_type: message_type,
            title: title,
            message: message,
            status: 'unread'
          }
        await this.insertData('sia_notifications', notificationData);
    }
    generateToken(user: UserRecord): string {
        return jwt.sign(
            { username: user.username },
            config.secretKey,
            { expiresIn: '24h' }
        );
    }

    protected makeResponse<T>(status: number, message: string, data?: T): ApiResponse<T> {
        return {
            status,
            message,
            data
        };
    }

    protected async getUserByUsername(username: string, email: string) {
        const users: any = await this.callQuery(
            `SELECT * FROM sia_users WHERE username = '${username}' AND email = '${email}'`
        );
        return users[0] || null;
    }

    protected async getUserByCode(username: string, code: string) {
        const users: any = await this.callQuery(
            `SELECT * FROM sia_users WHERE username = '${username}' AND auth_code = '${code}'`
        );
        return users[0] || null;
    }

    protected async getFees(feeType: string) {
        const fees: any = await this.callQuery(
            `SELECT fee_amount FROM sia_fees WHERE operation = '${feeType}'`
        );
        return fees[0]?.fee_amount || null;
    }

    protected getUserInfo(user: UserRecord): Partial<UserRecord> {
        return {
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            public_key: user.public_key,
            validator: user.validator
        };
    }

    async verifyToken(token: string) {
        try {
            const decoded: any = jwt.verify(token, config.secretKey);
            return decoded;
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    async generateWallet(user_id: any) {
        try {
            const chain = 'stellar';
            const existingWallet: any = await this.callQuery(
                `SELECT * FROM sia_wallets where user_id = '${user_id}'`
            );

            if (existingWallet.length > 0) {
                console.log('Wallet already exists for user:', user_id);
                // Return wallet but decrypt the secret first
                const wallet: WalletRecord = existingWallet[0];
                // Don't include decrypted secret in logs
                console.log('Retrieved existing wallet with public key:', wallet.publicKey);
                return {
                    ...wallet,
                    secret: Encryption.decrypt(wallet.secret),
                    mnemonic: wallet.mnemonic ? Encryption.decrypt(wallet.mnemonic) : undefined
                };
            }

            const wallet: { publicKey: string; secret: string; mnemonic?: string } = await new Stellar().generateKeypair();
            console.log('Generated new wallet with public key:', wallet.publicKey);

            // Encrypt the secret key before storing
            const encryptedSecret = Encryption.encrypt(wallet.secret);

            const walletData: WalletRecord = {
                user_id: user_id,
                chain: chain,
                publicKey: wallet.publicKey,
                secret: encryptedSecret, // Store encrypted secret
                mnemonic: wallet.mnemonic ? Encryption.encrypt(wallet.mnemonic) : undefined // Encrypt mnemonic if available
            }

            await this.insertData('sia_wallets', walletData);

            // Return wallet with decrypted secret (only for immediate use)
            return {
                ...walletData,
                secret: wallet.secret, // Return original secret
                mnemonic: wallet.mnemonic // Return original mnemonic
            };
        } catch (error) {
            console.error('Wallet generation error:', error);
            return false;
        }
    }

    async sendAppNotification(type: string, userId: any, recUserId: any, amount: any, currency: any, payment_mode: any, fee: any=0) {

        console.log("sendAppNotification", type, userId, recUserId, amount, currency, payment_mode, fee);
        try {
            let rec_name = recUserId;

        
            const senderInfo: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE user_id = '${userId}'`
            );
            if (senderInfo.length == 0) {
                return false;
            }
            const receiverInfo: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE user_id = '${recUserId}'`
            );

            if (receiverInfo.length > 0) {
                rec_name = receiverInfo[0].full_name;
            }

            const sender = senderInfo[0];
            const fcm_token = sender.fcm_token || "";
            const phone_number = sender.phone_number || "";
            const constructedMessage = this.constructMessage(type, amount, currency, payment_mode, rec_name, fee);
            console.log("constructedMessage", constructedMessage);

            const title = "Transaction";
            const message_type = "transaction";
            const data = {
                title,
                body: constructedMessage
            }

            await sendNotification(fcm_token, data);
         //   await new SMSHelper().sendEgoSMS(phone_number, constructedMessage);
            this.saveNotification(userId, message_type, title, constructedMessage);

        } catch (error) {
            console.error('Approval notification error:', error);
        }
        return true;
    }

    constructMessage(type: string, amount: any, currency: any, payment_mode: any, username: any, fee: any = 0) {
        const message = messageTypes[type as keyof typeof messageTypes] || "";
        return message.replace("{amount}", amount).replace("{currency}", currency).replace("{payment_mode}", payment_mode).replace("{username}", username).replace("{fee}", fee).replace("{date}", new Date().toLocaleString());
    }


    protected async getWallet(username: string) {
        try {

            const userInfoTwo: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE user_id = '${username}' or username='${username}'`
            );

            if (userInfoTwo.length == 0) {
                return null
            }

            const userId = userInfoTwo[0].user_id
            const currency = userInfoTwo[0].currency


            const wallet: any = await this.callQuery(
                `SELECT * FROM sia_wallets WHERE user_id = '${userId}'`
            );

            if (wallet.length > 0) {
                // Decrypt the secret before returning
                const walletData: WalletRecord = wallet[0];
                // Don't log sensitive data
                console.log('Retrieved wallet for user:', userId);

                return {
                    currency: currency,
                    ...walletData,
                    secret: Encryption.decrypt(walletData.secret),
                    mnemonic: walletData.mnemonic ? Encryption.decrypt(walletData.mnemonic) : undefined
                };
            }

            // Generate a new wallet if none exists
            return await this.generateWallet(userId);
        } catch (error) {
            return false;
        }
    }

    async validatePin(userId: string, pin: string) {
        try {
            if (!userId || !pin) {
                return this.makeResponse(400, "User ID and PIN are required");
            }

            // Fetch user PIN
            const userResult: any = await this.callQuery(`SELECT * FROM sia_users WHERE user_id='${userId}'`);
            if (userResult.length === 0) {
                return this.makeResponse(404, "User not found");
            }
            const user = userResult[0];

            // Fetch pin attempt record
            const attemptResult: any = await this.callQuery(`
            SELECT failed_attempts, lock_time, last_failed_attempt 
            FROM pin_attempts 
            WHERE user_id='${userId}'
          `);

            const now = new Date();
            let failedAttempts = 0;
            let lockTime: Date | null = null;
            let lastFailed: Date | null = null;

            if (attemptResult.length > 0) {
                failedAttempts = attemptResult[0].failed_attempts;
                lockTime = attemptResult[0].lock_time ? new Date(attemptResult[0].lock_time) : null;
                lastFailed = attemptResult[0].last_failed_attempt ? new Date(attemptResult[0].last_failed_attempt) : null;

                if (lockTime && (now.getTime() - lockTime.getTime()) < 86400000) {
                    return this.makeResponse(403, "Account is locked due to multiple failed PIN attempts. Try again after 24 hours.");
                }

                if (lockTime && (now.getTime() - lockTime.getTime()) >= 86400000) {
                    // Unlock after 24 hours
                    await this.callQuery(`DELETE FROM pin_attempts WHERE user_id = '${userId}'`);
                    failedAttempts = 0;
                    lockTime = null;
                    lastFailed = null;
                }
            }

            const within3Minutes = lastFailed && (now.getTime() - lastFailed.getTime()) < 180000;

            // Show warnings


            const hashedInputPin = this.hashPin(pin);
            const pinValid = user.wallet_pin === hashedInputPin;

            if (!pinValid) {
                const newAttempts = within3Minutes ? failedAttempts + 1 : 1;

                if (newAttempts >= 5) {
                    const lockNow = now.toISOString().slice(0, 19).replace('T', ' ');
                    if (attemptResult.length > 0) {
                        await this.callQuery(`
                  UPDATE pin_attempts
                  SET failed_attempts = ${newAttempts}, lock_time = '${lockNow}', last_failed_attempt = NOW()
                  WHERE user_id = '${userId}'
                `);
                    } else {
                        await this.callQuery(`
                  INSERT INTO pin_attempts (user_id, failed_attempts, lock_time, last_failed_attempt)
                  VALUES ('${userId}', ${newAttempts}, '${lockNow}', NOW())
                `);
                    }

                    return this.makeResponse(403, "Account is now locked due to multiple failed PIN attempts. Try again after 24 hours.");
                }

                // Update failed attempts if under 5
                if (attemptResult.length > 0) {
                    await this.callQuery(`
                UPDATE pin_attempts
                SET failed_attempts = ${newAttempts}, last_failed_attempt = NOW()
                WHERE user_id = '${userId}'
              `);
                } else {
                    await this.callQuery(`
                INSERT INTO pin_attempts (user_id, failed_attempts, last_failed_attempt)
                VALUES ('${userId}', 1, NOW())
              `);
                }

                if (within3Minutes && failedAttempts === 3) {
                    return this.makeResponse(403, "You have 2 attempts left. Please try again.");
                }
                if (within3Minutes && failedAttempts === 4) {
                    return this.makeResponse(403, "You have 1 attempt left. Please try again.");
                }

                return this.makeResponse(401, "Invalid PIN");
            }

            // On success, reset
            await this.callQuery(`DELETE FROM pin_attempts WHERE user_id = '${userId}'`);

            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    type: 'access'
                },
                config.secretKey,
                { expiresIn: '124h' }
            );

            return this.makeResponse(200, "PIN validated successfully", {
                token: token
            });

        } catch (error: any) {
            console.error("Error validating PIN:", error.message);
            return this.makeResponse(500, "Error validating PIN");
        }
    }

    hashPin(pin: string): string {
        return crypto.createHash('sha256').update(pin).digest('hex');
    }
    async giveAirdrop(userId: string, amount: string, token: string) {
        try {
            console.log("Give airdrop", userId, amount, token);

            // First, make sure the user exists
            const user = await this.getUserById(userId);
            if (!user) {
                return this.makeResponse(404, "User not found");
            }

            // Generate or retrieve wallet with proper error handling
            let wallet;
            try {
                wallet = await this.generateWallet(userId);
                if (!wallet || !wallet.publicKey || !wallet.secret) {
                    return this.makeResponse(500, "Failed to retrieve or generate wallet");
                }
                console.log("Retrieved wallet with public key:", wallet.publicKey);
            } catch (walletError: any) {
                console.error("Wallet error:", walletError);
                return this.makeResponse(500, "Error retrieving wallet information");
            }

            // Make sure the secret key is a valid string
            if (typeof wallet.secret !== 'string' || wallet.secret.trim() === '') {
                return this.makeResponse(400, "Invalid wallet secret key");
            }

            // Attempt to sponsor the account
            try {

                const txArray: Recipient[] = [
                    {
                        publicKey: wallet.publicKey,
                        amount: amount,
                        asset_code: token,
                        asset_issuer: new Stellar().assetIssuer,
                        senderSecretKey: new Stellar().assetIssuerPv || '',
                        creditPrivateKey: wallet.secret
                    }
                ]

                const response = await new Stellar().makeBatchTransfers("transfer", txArray);
                console.log(`response`, response);


                if (response && response.status === 200) {
                    return this.makeResponse(200, "Airdrop given successfully", {
                        public_key: wallet.publicKey,
                        transaction_hash: response.message
                    });
                } else {
                    return this.makeResponse(response.status || 500, response.message || "Failed to sponsor account");
                }
            } catch (error: any) {
                console.error('Sponsorship error:', error);
                return this.makeResponse(500, error.message || "Error during account sponsorship");
            }
        } catch (error: any) {
            console.error('Give airdrop error:', error);
            return this.makeResponse(500, "Failed to give airdrop", {
                error: error.message || "Unknown error"
            });
        }
    }


}

// Middleware for token verification
export function tokenRequired(req: AuthenticatedRequest, res: Response, next: NextFunction): Response | void {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json('No token provided');
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.secretKey) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json('Invalid token');
    }
} 
