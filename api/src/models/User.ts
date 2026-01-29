import { Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Modal from '../libs/modal';
import EmailSender from '../libs/email.helper';
import { Encryption } from '../libs/encryption';
const emailSender = new EmailSender();

import { UserData, ApiResponse, UserProfile } from '../types';
const { OAuth2Client } = require('google-auth-library');

interface UserRecord {
    username: string;
    password: string;
    email: string;
    public_key: string;
    secret?: string;
    is_validator: boolean;
    fcm: string;
    reset_code?: string;
    favorites?: string[];
    avatar: string;
    validator: boolean;
    user_id: number;
    created_at: Date;
    pin?: string;
    otp?: string;
    otp_expiry?: Date;
    email_verified?: boolean;
}

interface UserInfo extends Partial<UserData> {
    mnemonic_phrase?: string;
    token?: string;
    jwt?: string;
    user?: {
        id: number;
        username: string;
        email: string;
        email_verified?: boolean;
    };
}

interface UserRegistrationData {
    username: string;
    password: string;
    email: string;
}

interface UserLoginData {
    username: string;
    password: string;
}

interface UserProfileData {
    followers: number;
    following: number;
    played: number;
    won: number;
    lost: number;
}

interface UserFollowRecord {
    user_id: string;
    following_user_id: string;
    follow_status: boolean;
}

interface UserUpdateData {
    user_id: string;
    fcm: string;
}

interface PasswordResetInitData {
    username: string;
    email: string;
}

interface PasswordResetData {
    username: string;
    code: string;
    password: string;
    confirm_password: string;
}

interface FavoriteUpdateData {
    user_id: string;
    category_name: string;
}

interface UserSearchResult {
    id: string;
    username: string;
    public_key: string;
}

interface OTPRecord {
    id: number;
    email: string;
    otp: string;
    expiry: Date;
    used: boolean;
    created_at: Date;
}

export class User extends Modal {
    async getCountries(): Promise<any> {
        const countries = await this.callQuery(`SELECT * FROM countries`);
        return this.makeResponse(200, "Countries retrieved successfully", countries);

    }

    async getCountryByCode(code: any): Promise<any> {
        const countries: any = await this.callQuery(`SELECT * FROM countries WHERE country_id = '${code}'`);
        return countries.length > 0 ? countries[0] : null;

    }


    async registerTelegramUser(telegramUser: any): Promise<any> {
        const { id, username, first_name, last_name, photo_url } = telegramUser;
        const email = username ? `${username}@telegram` : undefined;
        const full_name = `${first_name} ${last_name}`;
        const avatar = photo_url;
        try {
            // Check if user already exists
            const existingUser = await this.getUserByUsername(username);
            if (existingUser) {
                return {
                    status: 400,
                    message: 'Username already exists'
                };
            }

            // Generate a unique user ID
            const userId = this.generateUserId();

            // Create user reco rd
            const userData = {
                user_id: userId,
                username: username,
                email: email,
                full_name: full_name,
                avatar: avatar || this.generateDefaultAvatar(userId),
                created_at: new Date(),
                telegram_id: id,
                is_telegram_user: true
            };

            // Insert user into database
            await this.insertData('sia_users', userData);

            // Generate JWT token
            const token = jwt.sign(
                {
                    user_id: userId,
                    username: username,
                    email: email
                },
                (process.env.JWT_SECRET || 'your-secret-key'),
                { expiresIn: '24h' }
            );

            return {
                status: 200,
                message: 'User registered successfully',
                data: {
                    token,
                    user: {
                        user_id: userId,
                        username: username,
                        email: email,
                        full_name: full_name,
                        avatar: userData.avatar
                    }
                }
            };
        } catch (error) {
            console.error('Telegram user registration error:', error);
            return {
                status: 500,
                message: 'Failed to register user'
            };
        }


    }
    async getUserById(userId: any): Promise<any> {
        const users: any = await this.callQuery(
            `SELECT * FROM sia_users WHERE user_id = '${userId}'`
        );
        return users.length > 0 ? users[0] : null;
    }
    generateDefaultAvatar(userId: any): string {
        // Get a unique identifier for this user
        const identifier = userId

        // Use a consistent style for all generated avatars
        const style = 'avataaars';

        // Clean the identifier to ensure it works with the API
        const cleanIdentifier = encodeURIComponent(identifier.trim().toLowerCase());

        // Create a DiceBear URL
        return `https://api.dicebear.com/6.x/${style}/svg?seed=${cleanIdentifier}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }

    async getUserByUsername(username: any): Promise<any> {
        const users: any = await this.callQuery(
            `SELECT * FROM sia_users WHERE username = '${username}'`
        );
        return users.length > 0 ? users[0] : null;
    }

    async getUserByCode(code: any): Promise<any> {
        const users: any = await this.callQuery(
            `SELECT * FROM sia_users WHERE reset_code = '${code}'`
        );
        return users.length > 0 ? users[0] : null;
    }

    async getUserByEmail(email: string): Promise<any> {
        try {
            const users: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE email = '${email}'`
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Get user by email error:', error);
            throw error;
        }
    }

    async registerUser(req: any): Promise<any> {
        try {
            const { referral_code, phone_number, first_name, last_name, full_name, email, username, currency, country_code, password } = req;
            const randomUsername = Math.random().toString(36).substring(2, 10) + (new Date()).getTime().toString(36);

            const name = full_name || (first_name && last_name ? `${first_name} ${last_name}`.trim() : null) || email?.split('@')[0] || randomUsername;

          //  const username = email.split('@')[0] || randomUsername;

            const country = await this.getCountryByCode(country_code);
            if (country.length === 0) {
                return this.makeResponse(400, "Invalid country code");
            }
            const country_name = country.name || "Unknown";
 



            // Check if email exists
            const existingEmail: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE email = '${email}'`
            )
            const finalUsername = username || email?.split('@')[0] || randomUsername;
            const existingUsername: any = await this.callQuery(
                `SELECT * FROM sia_users WHERE username = '${(finalUsername + '').replace(/'/g, "''")}'`
            )

            if (existingEmail.length > 0) {
                console.log('Email already exists:', email);
              //  return this.makeResponse(409, 'Email already exists');
            }

            if (existingUsername.length > 0) {
                console.log('Username already exists:', finalUsername);
                return this.makeResponse(409, 'Username already exists');
            }

            // Generate wallet with encrypted keys
            const user_id = this.generateUserId();

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Default currency from country or UGX (e.g. 256 -> UGX, 254 -> KES)
            const currencyByCountry: Record<string, string> = { '256': 'UGX', '254': 'KES' };
            const currencyToSave = currency || currencyByCountry[String(country_code)] || 'UGX';

            // Insert user with wallet public key only
            const result = await this.insertData('sia_users', {
                referer: referral_code,
                user_id: user_id,
                full_name: name,
                avatar: this.generateDefaultAvatar(user_id),
                username: finalUsername,
                country_code: country_code,
                currency: currencyToSave,
                phone_number,
                email,
                password: hashedPassword
                // No longer storing secret in users table
            });

            // Generate OTP
            await this.generateOTP(email);

            return this.makeResponse(200, "Registration successful. Please verify your email.", {
                email
            });
        } catch (error) {
            console.error('Registration error:', error);
            return this.makeResponse(500, "Registration failed", {
                error
            });
        }
    }

    generateUserId() {
        return Math.floor(20000000 + Math.random() * 90000000).toString();
    }



    async login(req: any): Promise<any> {
        try {
            const { email, password } = req;
            console.log('Login attempt for user:', email);

            // Get user
            const users = await this.callQuery(
                `SELECT * FROM sia_users WHERE email = '${email}'`
            ) as any[];

            if (users.length === 0) {
                console.log('User not found:', email);
                return {
                    status: 404,
                    message: 'User not found'
                };
            }

            const user = users[0];
            console.log('Found user:', { user_id: user.user_id, email: user.email });

            // Verify password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                console.log('Invalid password for user:', email);
                return {
                    status: 401,
                    message: 'Invalid password'
                };
            }

            // Check if email is verified
            if (!user.email_verified) {
                console.log('Email not verified for user:', email);
                // Generate OTP
                await this.generateOTP(user.email);
                return {
                    status: 203,
                    message: 'Email not verified. Please verify your email first',
                    data: {
                        email: user.email
                    }
                };
            }

            // Generate refresh token
            const refreshToken = jwt.sign(
                {
                    user_id: user.user_id,
                    type: 'refresh'
                },
                (process.env.JWT_SECRET || 'your-secret-key'),
                { expiresIn: '7d' }
            );
            try {
                await this.insertData('auth_tokens', {
                    user_id: user.user_id,
                    refresh_token: refreshToken
                });
            } catch (error) {
                await this.updateData('auth_tokens', `user_id = '${user.user_id}'`, {
                    refresh_token: refreshToken
                });
                console.error('Failed to insert refresh token:', error);
            }


            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    type: 'access'
                },
                (process.env.JWT_SECRET || 'your-secret-key'),
                { expiresIn: '124h' }
            );

            this.generateWallet(user.user_id);

            const country = await this.getCountryByCode(user.country_code);
            const country_name = country.name || "Unknown";
 

            return {
                status: 200,
                message: 'Login successful',
                data: {
                    token,
                    refreshToken,
                    user: {
                        user_id: user.user_id,
                        username: user.username,
                        email: user.email,
                        email_verified: user.email_verified,
                        public_key: user.public_key,
                        full_name: user.full_name,
                        country_code: user.country_code,
                        country: country_name,
                        currency: user.currency,
                        phone_number: user.phone_number,
                        has_wallet_pin: user.wallet_pin ? true : false
                    }

                }
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                status: 500,
                message: 'Login failed'
            };
        }
    }
    async changePin(userId: string, oldPin: string, newPin: string): Promise<any> {
        try {
            const oldPinHash = this.hashPin(oldPin);
            // Validate PIN
            const isValidPin = await this.validatePin(userId, oldPin);
            if (isValidPin.status !== 200) {
                return isValidPin;
            }
            const user = await this.getUserById(userId);
            const newHashedPin = this.hashPin(newPin);
            // Update PIN
            const updateData = {
                wallet_pin: newHashedPin
            };

            await this.updateData('sia_users', `user_id = '${userId}'`, updateData);
            const email = user.email;
            const template = `Hello, Your Wallet pin has been changed, if this was not you, please contact support`;
            await emailSender.sendMail(email, 'PIN Changed', 'PIN Changed', template);

            return this.makeResponse(200, "PIN changed successfully");

        } catch (error) {
            console.error('Change PIN error:', error);
            return this.makeResponse(500, "Failed to change PIN");
        }
    }

    async makeValidator(req: any): Promise<any> {
        try {
            const { user_id } = req.body;
            const updateData = {
                is_validator: true,
                user_id
            };
            await this.updateData('sia_users', `user_id = '${user_id}'`, updateData);
            return { message: 'User is now a validator' };
        } catch (error) {
            console.error('Make validator error:', error);
            return { error: 'Failed to make user a validator' };
        }
    }

    async updateProfile(req: any): Promise<any> {
        try {
            const { userId, full_name, avatar, username, fcm } = req;
            const updateData: any = {};
            if (avatar) {
                updateData.avatar = avatar
            }
            if (full_name) {
                updateData.full_name = full_name;
            }
            if (fcm) {
                updateData.fcm = fcm;
            }
            if (username) {
                updateData.username = username;
            }
            await this.updateData('sia_users', `user_id = '${userId}'`, updateData);
            return this.makeResponse(200, "Profile updated successfully", updateData);
        } catch (error: any) {
            console.error('Update profile error:', error);
            return this.makeResponse(500, "Failed to update profile", { error: error.message || "Unknown error" });
        }
    }

    async updateFavorite(req: any): Promise<any> {
        try {
            const { user_id, category_name } = req.body;
            const userInfo = await this.getUserById(user_id);

            if (!userInfo) {
                return { error: 'User not found' };
            }

            const favorites = userInfo.favorites || [];
            if (!favorites.includes(category_name)) {
                favorites.push(category_name);
            }

            const updateData = {
                favorites: favorites,
                user_id
            };

            await this.updateData('sia_users', `user_id = '${user_id}'`, updateData);
            return { message: 'Favorites updated successfully' };
        } catch (error) {
            console.error('Update favorites error:', error);
            return { error: 'Failed to update favorites' };
        }
    }

    async changePasswordInit(req: any): Promise<any> {
        try {
            const { username, email } = req.body;
            const user = await this.getUserByUsername(username);

            if (!user || user.email !== email) {
                return { error: 'Username or email not found' };
            }

            const code = '55555'; // Same as Python implementation
            const updateData = {
                reset_code: code,
                username
            };
            await this.updateData('sia_users', `username = '${username}'`, updateData);
            return { message: 'Reset code sent' };
        } catch (error) {
            console.error('Password reset init error:', error);
            return { error: 'Failed to initiate password reset' };
        }
    }

    async changePassword(req: any): Promise<any> {
        try {
            const { username, code, password } = req.body;

            const user = await this.getUserByCode(code);
            if (!user || user.username !== username) {
                return { error: 'Invalid reset code' };
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const updateData = {
                password: hashedPassword,
                reset_code: null,
                username
            };

            await this.updateData('sia_users', `username = '${username}'`, updateData);
            return { message: 'Password has been reset successfully' };
        } catch (error) {
            console.error('Password reset error:', error);
            return { error: 'Failed to reset password' };
        }
    }

    async searchUsers(query: any): Promise<any> {
        const users = await this.callQuery(
            `SELECT email,currency,full_name,user_id, username,avatar FROM sia_users 
             WHERE username LIKE '%${query}%' 
             LIMIT 10`
        );
        return this.makeResponse(200, "Users found", users);
    }

    async followUser(_req: any): Promise<any> {
        return { message: 'Follow feature not available' };
    }

    async getFollowing(_userId: any): Promise<any> {
        return [];
    }

    async getFollowers(_userId: any): Promise<any> {
        return [];
    }

    async getProfile(userId: any): Promise<any> {
        // Betting and follow stats removed; return zeros
        return { followers: 0, following: 0, played: 0, won: 0, lost: 0 };
    }

    async setupPIN(userId: any, pin: any): Promise<any> {
        try {
            // Hash the PIN
            const hashedPIN = await bcrypt.hash(pin, 10);

            // Update user with hashed PIN
            await this.updateData('sia_users', `user_id = '${userId}'`, { pin: hashedPIN });

            return {
                status: 200,
                message: 'PIN setup successful'
            };
        } catch (error) {
            console.error('Setup PIN error:', error);
            return {
                status: 500,
                message: 'Failed to setup PIN'
            };
        }
    }

    async verifyPIN(userId: any, pin: any): Promise<any> {
        try {
            // Get user's hashed PIN
            const users = await this.callQuery(
                `SELECT pin FROM sia_users WHERE user_id = '${userId}'`
            ) as any[];

            if (users.length === 0) {
                return {
                    status: 404,
                    message: 'User not found'
                };
            }

            const hashedPIN = users[0].pin;
            if (!hashedPIN) {
                return {
                    status: 400,
                    message: 'PIN not set up'
                };
            }

            // Verify PIN
            const isValid = await bcrypt.compare(pin, hashedPIN);
            if (!isValid) {
                return {
                    status: 401,
                    message: 'Invalid PIN'
                };
            }

            return {
                status: 200,
                message: 'PIN verification successful'
            };
        } catch (error) {
            console.error('Verify PIN error:', error);
            return {
                status: 500,
                message: 'Failed to verify PIN'
            };
        }
    }

    async hasPIN(userId: any): Promise<any> {
        try {
            // Check if user has a PIN set
            const users = await this.callQuery(
                `SELECT pin FROM sia_users WHERE user_id = '${userId}'`
            ) as any[];

            if (users.length === 0) {
                return {
                    status: 404,
                    message: 'User not found'
                };
            }

            const hasPIN = !!users[0].pin;

            return {
                status: 200,
                message: hasPIN ? 'User has PIN set' : 'User has no PIN set',
                data: { hasPIN }
            };
        } catch (error) {
            console.error('Has PIN error:', error);
            return {
                status: 500,
                message: 'Failed to check PIN status'
            };
        }
    }
    async getUserByPhone(phone: any): Promise<any> {
        const user = await this.callQuery(
            `SELECT * FROM sia_users WHERE phone_number = '${phone}'`
        ) as any[];
        return user[0];
    }

    async generateMobileOTP(phone: any): Promise<any> {
        try {
            const user = await this.getUserByPhone(phone);
            if (!user) {
                return {
                    status: 404,
                    message: 'User not found'
                };
            }
            const otp = Math.floor(200000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 15 * 60 * 2000); // 15 minutes

            const otpData = {
                email: phone,
                otp,
                expiry: otpExpiry,
                used: false,
                created_at: new Date()
            };

            await this.insertData('sia_otps', otpData);

            return {
                status: 200,
                message: `OTP sent successfully to ${phone}. For testing use only, code is ${otp}`,
            };
        } catch (error) {
            console.error('Generate mobile OTP Error:', error);
            return {
                status: 500,
                message: 'Failed to generate mobile OTP'
            };
        }
    }

    async generateOTP(email: any): Promise<any> {
        try {
            // Generate 6-digit OTP
            const otp = Math.floor(200000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 15 * 60 * 2000); // 15 minutes

            // First, invalidate any existing OTPs for this email
            await this.callQuery(
                `DELETE FROM  sia_otps  WHERE email = '${email}' `
            );

            // Insert new OTP record
            const otpData = {
                email,
                otp,
                expiry: otpExpiry,
                used: false,
                created_at: new Date()
            };

            await this.insertData('sia_otps', otpData);

            // Send OTP via email
            // You can use your existing email helper here
            await emailSender.sendMail(email, 'Email Verification', 'Email Verification', `Your verification code is: ${otp}`);

            return {
                status: 200,
                message: 'OTP sent successfully'
            };
        } catch (error) {
            console.error('Generate OTP Error:', error);
            return {
                status: 500,
                message: 'Failed to generate OTP'
            };
        }
    }

    async verifyRegistrationOTP(email: string, otp: string): Promise<any> {
        try {
            console.log('Verifying registration OTP for email:', email);

            // Get OTP
            const otps = await this.callQuery(
                `SELECT * FROM sia_otps WHERE email = '${email}' AND otp = '${otp}' AND used = 0 AND created_at > NOW() - INTERVAL 10 MINUTE`
            ) as any[];

            if (otps.length === 0) {
                console.log('Invalid or expired OTP for email:', email);
                return {
                    status: 400,
                    message: 'Invalid or expired OTP'
                };
            }

            // Mark OTP as used
            await this.updateData('sia_otps', `id = '${otps[0].id}'`, { used: true });

            // Update user verification status
            await this.updateData('sia_users', `email = '${email}'`, { email_verified: 1 });

            // Get user
            const users = await this.callQuery(
                `SELECT * FROM sia_users WHERE email = '${email}'`
            ) as any[];

            if (users.length === 0) {
                throw new Error('User not found');
            }

            const user = users[0];

            // Generate JWT
            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email
                },
                (process.env.JWT_SECRET || 'your-secret-key'),
                { expiresIn: '24h' }
            );

            console.log('Email verification successful for user:', user.username);
            return {
                status: 200,
                message: 'Email verified successfully',
                data: {
                    token,
                    user: {
                        user_id: user.user_id,
                        username: user.username,
                        email: user.email,
                        email_verified: true
                    }
                }
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                status: 500,
                message: 'Email verification failed'
            };
        }
    }

    async verifyResetOTP(email: any, otp: any): Promise<any> {
        try {
            console.log('Starting password reset OTP verification for email:', email);

            // Get the latest unused OTP for this email
            const otps = await this.callQuery(
                `SELECT * FROM sia_otps 
                WHERE email = '${email}' 
                AND used = false 
                AND expiry > NOW() 
                ORDER BY created_at DESC 
                LIMIT 1`
            ) as any[];

            if (otps.length === 0) {
                console.log('No valid OTP found for email:', email);
                return {
                    status: 400,
                    message: 'No valid OTP found. Please request a new one'
                };
            }

            const otpRecord = otps[0];
            console.log('Found OTP record:', { id: otpRecord.id, email: otpRecord.email });

            // Verify OTP
            if (otpRecord.otp !== otp) {
                console.log('Invalid OTP provided:', { provided: otp, expected: otpRecord.otp });
                return {
                    status: 400,
                    message: 'Invalid OTP'
                };
            }

            // Mark OTP as used
            await this.updateData('sia_otps', `id = '${otpRecord.id}'`, { used: true });
            console.log('Marked OTP as used:', otpRecord.id);

            // Get user
            const users = await this.callQuery(
                `SELECT * FROM sia_users WHERE email = '${email}'`
            ) as any[];

            if (users.length === 0) {
                console.log('User not found for email:', email);
                return {
                    status: 404,
                    message: 'User not found'
                };
            }

            console.log('OTP verification completed successfully for password reset');
            return {
                status: 200,
                message: 'OTP verified successfully'
            };
        } catch (error) {
            console.error('Verify Reset OTP Error:', error);
            return {
                status: 500,
                message: 'Failed to verify OTP'
            };
        }
    }

    async updatePassword(email: any, newPassword: any): Promise<any> {
        try {
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update user's password
            await this.updateData('sia_users', `email = '${email}'`, { password: hashedPassword });

            return {
                status: 200,
                message: 'Password updated successfully'
            };
        } catch (error) {
            console.error('Update password error:', error);
            return {
                status: 500,
                message: 'Failed to update password'
            };
        }
    }

    private isValidEmail(email: any): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async updatePushToken(userId: string, token: string, device: string): Promise<any> {
        try {
            const result: any = await this.callQuery(
                `UPDATE sia_users SET fcm_token = '${token}' WHERE user_id = '${userId}'`
            );

            if (result.affectedRows === 0) {
                return this.makeResponse(404, "User not found");
            }

            return this.makeResponse(200, "Push token updated successfully");
        } catch (error) {
            console.error('Update push token error:', error);
            return this.makeResponse(500, "Failed to update push token");
        }
    }

    async getNotifications(userId: string): Promise<any> {
    try {
      //  const notifications = await this.callQuery(`SELECT * FROM sia_notifications WHERE user_id='${userId}' ORDER BY created_at DESC LIMIT 50`);
        const notifications = await this.callQuery(`SELECT * FROM sia_notifications  ORDER BY created_at DESC LIMIT 50`);
        return { status: 200, message: 'Notifications retrieved successfully', data: notifications };
    } catch (error: any) {
      console.error('Error getting notifications:', error);
      return { status: 500, message: 'Failed to get notifications' };
    }
  }

  async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<any> {
    try {
      if (!notificationIds || notificationIds.length === 0) {
        return { status: 400, message: 'No notification IDs provided' };
      }
      
      const ids = notificationIds.map(id => `'${id}'`).join(',');
      await this.callQuery(
        `UPDATE sia_notifications SET read_at = NOW() WHERE id IN (${ids}) AND user_id='${userId}'`
      );
      return { status: 200, message: 'Notifications marked as read' };
    } catch (error: any) {
      console.error('Error marking notifications as read:', error);
      return { status: 500, message: 'Failed to mark notifications as read' };
    }
  }

  async deleteNotifications(userId: string, notificationIds: string[]): Promise<any> {
    try {
      if (!notificationIds || notificationIds.length === 0) {
        return { status: 400, message: 'No notification IDs provided' };
      }
      
      const ids = notificationIds.map(id => `'${id}'`).join(',');
      await this.callQuery(
        `DELETE FROM sia_notifications WHERE id IN (${ids}) AND user_id='${userId}'`
      );
      return { status: 200, message: 'Notifications deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting notifications:', error);
      return { status: 500, message: 'Failed to delete notifications' };
    }
  }

  async googleLoginOrRegister(data: any): Promise<any> {
        try {
            const { idToken } = data;

            if (!idToken) {
                throw new Error('ID token is required');
            }

            // Verify the ID token with Google
            const client = new OAuth2Client((process.env.GOOGLE_CLIENT_ID || '10349883522-hf77q9tpsqv631fuja0i7uun86j8tij5.apps.googleusercontent.com'));
            let ticket;

            try {
                ticket = await client.verifyIdToken({
                    idToken: idToken,
                    audience: (process.env.GOOGLE_CLIENT_ID || '10349883522-hf77q9tpsqv631fuja0i7uun86j8tij5.apps.googleusercontent.com'),
                });
            } catch (error) {
                console.error('Google token verification failed:', error);
                throw new Error('Invalid Google token');
            }

            const payload = ticket.getPayload();
            if (!payload) {
                throw new Error('Invalid token payload');
            }

            console.log('Verified Google user:', { email: payload.email, name: payload.name });

            // Check if user already exists
            const existingUser = await this.getUserByEmail(payload.email);
            if (existingUser) {
                console.log('User already exists:', existingUser.user_id);

                // Generate JWT token for existing user
                const token = jwt.sign(
                    {
                        user_id: existingUser.user_id,
                        email: existingUser.email,
                        type: 'access'
                    },
                    (process.env.JWT_SECRET || 'your-secret-key'),
                    { expiresIn: '7d' }
                );

                return {
                    status: 200,
                    message: 'Login successful',
                    data: {
                        token,
                        user: existingUser
                    }
                };
            }

            // Generate username from email
            const username = payload.email.split('@')[0];
            const userId = this.generateUserId();

            // Hash password
            const hashedPassword = await bcrypt.hash(payload.sub, 10);

            // Create new user
            const result = await this.insertData('sia_users', {
                user_id: userId,
                email: payload.email,
                username,
                full_name: payload.name,
                password: hashedPassword,
                email_verified: 1,
                avatar: payload.picture || '',
            });

            console.log('Created new user with ID:', userId);

            // Generate wallet
            await this.generateWallet(userId);

            // Get created user
            const user = await this.getUserById(userId);

            // Generate JWT token for new user
            const token = jwt.sign(
                {
                    user_id: user.user_id,
                    email: user.email,
                    type: 'access'
                },
                (process.env.JWT_SECRET || 'your-secret-key'),
                { expiresIn: '7d' }
            );

            return {
                status: 200,
                message: 'Registration successful',
                data: {
                    token,
                    user: user
                }
            };

        } catch (error) {
            console.error('Error in Google login/register:', error);
            throw error;
        }
    }
} 