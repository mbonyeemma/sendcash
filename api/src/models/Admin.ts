import Modal from '../libs/modal';
import * as db from '../libs/db.helper';
import bcrypt from 'bcryptjs';
import EmailSender from '../libs/email.helper';
import { adminEmailTemplates } from '../helpers/email.templates';
import jwt from 'jsonwebtoken';

const emailSender = new EmailSender();

// --- Types based on kitipay.sql ---
export interface UserInput {
  user_id: string;
  full_name?: string;
  username: string;
  password: string;
  email: string;
  avatar?: string;
  country_code?: string;
  currency?: string;
  wallet_pin?: string;
  phone_number?: string;
  is_merchant?: number;
  is_validator?: number;
}

export interface AdminUserInput {
  id?: string;
  username: string;
  password: string;
  email: string;
  full_name?: string;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface PaymentTypeInput {
  type: string;
  country: string;
  currency: string;
  operation: string;
  fee: number;
  fee_type: 'FLAT' | 'PERCENTAGE';
  min_amount: number;
  max_amount: number;
  status: 'active' | 'inactive';
}

export interface TransactionFilter {
  user_id?: string;
  status?: string;
  trans_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export class Admin extends Modal {
  // Helper method to generate random password
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Helper method to send welcome email with credentials
  private async sendWelcomeEmail(email: string, username: string, password: string, fullName?: string) {
    try {
      const template = adminEmailTemplates.WELCOME_USER;
      const body = template.template(fullName || '', username, password);

      await emailSender.sendMail(email, template.subject, template.heading, body);
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      // Don't throw error, just log it
    }
  }

  // Helper method to send password reset email
  private async sendPasswordResetEmail(email: string, username: string, newPassword: string, fullName?: string) {
    try {
      const template = adminEmailTemplates.PASSWORD_RESET;
      const body = template.template(fullName || '', username, newPassword);

      await emailSender.sendMail(email, template.subject, template.heading, body);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't throw error, just log it
    }
  }

  // Helper method to send welcome email for system users (admins)
  private async sendSystemUserWelcomeEmail(email: string, username: string, password: string, fullName?: string) {
    try {
      const template = adminEmailTemplates.WELCOME_SYSTEM_USER;
      const body = template.template(fullName || '', username, password);

      await emailSender.sendMail(email, template.subject, template.heading, body);
      console.log(`System user welcome email sent to ${email}`);
    } catch (error) {
      console.error('Error sending system user welcome email:', error);
      // Don't throw error, just log it
    }
  }
  // --- USER CRUD (sia_user) ---
  async getUsers(limit = 50, offset = 0, filters: Partial<UserInput> = {}) {
    let sql = 'SELECT * FROM sia_users';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Users retrieved', data);
  }

  async getUserById(user_id: string) {
    const data = await this.callQuery(`SELECT * FROM sia_users WHERE user_id='${user_id}' LIMIT 1`);
    return this.makeResponse(200, 'User retrieved', data[0] || null);
  }

  async createUser(input: UserInput) {
    try {
      // Generate random password if not provided
      const generatedPassword = input.password || this.generateRandomPassword();

      // Hash the password
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Only allow whitelisted fields and use hashed password
      const allowed: Partial<UserInput> = (({
        user_id, full_name, username, email, avatar, country_code, currency, wallet_pin, phone_number, is_merchant, is_validator
      }) => ({
        user_id,
        full_name,
        username,
        password: hashedPassword, // Use hashed password
        email,
        avatar,
        country_code,
        currency,
        wallet_pin,
        phone_number,
        is_merchant,
        is_validator
      }))(input);

      const data = await this.insertData('sia_users', allowed);

      if (data === false) {
        return this.makeResponse(500, 'Failed to create user', null);
      }

      // Send welcome email with credentials
      await this.sendWelcomeEmail(input.email, input.username, generatedPassword, input.full_name);

      return this.makeResponse(200, 'User created successfully. Welcome email sent.', {
        user_id: data,
        generated_password: generatedPassword
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return this.makeResponse(500, 'Error creating user', null);
    }
  }

  async updateUser(user_id: string, input: Partial<UserInput>) {
    try {
      // Only update fields that are actually provided
      const allowedFields = ['full_name', 'username', 'password', 'email', 'avatar', 'country_code', 'currency', 'wallet_pin', 'phone_number', 'is_merchant', 'is_validator'] as const;
      const updateData: Record<string, any> = {};

      Object.entries(input).forEach(([key, value]) => {
        if (allowedFields.includes(key as any) && value !== undefined) {
          // Hash password if it's being updated
          if (key === 'password') {
            updateData[key] = bcrypt.hashSync(String(value), 10);
          } else {
            updateData[key] = value;
          }
        }
      });

      if (Object.keys(updateData).length === 0) {
        return this.makeResponse(400, 'No valid fields to update', null);
      }

      await this.updateData('sia_users', `user_id='${user_id}'`, updateData);
      return this.makeResponse(200, 'User updated', true);
    } catch (error) {
      console.error('Error updating user:', error);
      return this.makeResponse(500, 'Failed to update user', null);
    }
  }

  async deleteUser(user_id: string) {
    try {
      await this.callQuery(`DELETE FROM sia_users WHERE user_id='${user_id}'`);
      return this.makeResponse(200, 'User deleted', null);
    } catch (error) {
      console.error('Error deleting user:', error);
      return this.makeResponse(500, 'Failed to delete user', null);
    }
  }

  async getUserTransactions(user_id: string, filter: TransactionFilter = {}) {
    let sql = `SELECT * FROM wl_transactions WHERE (user_id='${user_id}' OR cr_wallet_id='${user_id}' OR dr_wallet_id='${user_id}')`;
    if (filter.status) sql += ` AND status='${filter.status}'`;
    if (filter.trans_type) sql += ` AND trans_type='${filter.trans_type}'`;
    if (filter.from_date) sql += ` AND created_on >= '${filter.from_date}'`;
    if (filter.to_date) sql += ` AND created_on <= '${filter.to_date}'`;
    sql += ` ORDER BY created_on DESC`;
    sql += ` LIMIT ${filter.limit || 50} OFFSET ${filter.offset || 0}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'User transactions retrieved', data);
  }

  async getUserBalances(user_id: string) {
    const data = await this.callQuery(`SELECT * FROM sia_wallets WHERE user_id='${user_id}'`);
    return this.makeResponse(200, 'User balances retrieved', data);
  }

  // --- SYSTEM USER CRUD (admin_user) ---
  async getSystemUsers(limit = 50, offset = 0, filters: Partial<AdminUserInput> = {}) {
    let sql = 'SELECT * FROM admin_user';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'System users retrieved', data);
  }

  async getSystemUserById(id: string) {
    const data = await this.callQuery(`SELECT * FROM admin_user WHERE id='${id}' LIMIT 1`);
    return this.makeResponse(200, 'System user retrieved', data[0] || null);
  }

  async createSystemUser(input: AdminUserInput) {
    try {
      // Generate random password if not provided
      const generatedPassword = input.password || this.generateRandomPassword();

      // Hash the password
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Only allow whitelisted fields and use hashed password
      const allowed: Partial<AdminUserInput> = (({ username, email, full_name }) => ({
        username,
        password: hashedPassword, // Use hashed password
        email,
        full_name
      }))(input);

      const data = await this.insertData('admin_user', allowed);

      if (data === false) {
        return this.makeResponse(500, 'Failed to create system user', null);
      }

      // Send welcome email with credentials
      await this.sendSystemUserWelcomeEmail(input.email, input.username, generatedPassword, input.full_name);

      return this.makeResponse(200, 'System user created successfully. Welcome email sent.', {
        user_id: data,
        generated_password: generatedPassword
      });
    } catch (error) {
      console.error('Error creating system user:', error);
      return this.makeResponse(500, 'Error creating system user', null);
    }
  }

  async updateSystemUser(id: string, input: Partial<AdminUserInput>) {
    try {
      // Only update fields that are actually provided
      const allowedFields = ['username', 'password', 'email', 'full_name'] as const;
      const updateData: Record<string, any> = {};

      Object.entries(input).forEach(([key, value]) => {
        if (allowedFields.includes(key as any) && value !== undefined) {
          // Hash password if it's being updated
          if (key === 'password') {
            updateData[key] = bcrypt.hashSync(String(value), 10);
          } else {
            updateData[key] = value;
          }
        }
      });

      if (Object.keys(updateData).length === 0) {
        return this.makeResponse(400, 'No valid fields to update', null);
      }

      await this.updateData('admin_user', `id='${id}'`, updateData);
      return this.makeResponse(200, 'System user updated', true);
    } catch (error) {
      console.error('Error updating system user:', error);
      return this.makeResponse(500, 'Failed to update system user', null);
    }
  }

  async deleteSystemUser(id: string, loggedInUser: string) {
    try {
      if (loggedInUser == id) {
        return this.makeResponse(401, `You cannot delete your own account`, null);
      }

      await this.callQuery(`DELETE FROM admin_user WHERE id='${id}'`);
      return this.makeResponse(200, 'System user deleted', null);
    } catch (error) {
      console.error('Error deleting system user:', error);
      return this.makeResponse(500, 'Failed to delete system user', null);
    }
  }

  // --- WALLET MANAGEMENT ---
  async getWallets(limit = 50, offset = 0, filters: any = {}) {
    let sql = 'SELECT * FROM sia_wallets';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Wallets retrieved', data);
  }

  async getWalletById(id: string) {
    const data = await this.callQuery(`SELECT * FROM sia_wallets WHERE id='${id}' LIMIT 1`);
    return this.makeResponse(200, 'Wallet retrieved', data[0] || null);
  }

  async deactivateWallet(id: string) {
    try {
      // There is no 'active' field in sia_wallets, so let's assume we add one for admin control
      await this.updateData('sia_wallets', `id='${id}'`, { active: 0 });
      return this.makeResponse(200, 'Wallet deactivated', true);
    } catch (error) {
      console.error('Error deactivating wallet:', error);
      return this.makeResponse(500, 'Failed to deactivate wallet', null);
    }
  }

  // --- REPORTS ---
  async getTransactionReport(filter: TransactionFilter = {}) {
    let sql = 'SELECT * FROM wl_transactions WHERE 1=1';
    if (filter.user_id) sql += ` AND user_id='${filter.user_id}'`;
    if (filter.status) sql += ` AND status='${filter.status}'`;
    if (filter.trans_type) sql += ` AND trans_type='${filter.trans_type}'`;
    if (filter.from_date) sql += ` AND created_on >= '${filter.from_date}'`;
    if (filter.to_date) sql += ` AND created_on <= '${filter.to_date}'`;
    sql += ` ORDER BY created_on DESC`;
    sql += ` LIMIT ${filter.limit || 100} OFFSET ${filter.offset || 0}`;
    const data: any = await this.callQuery(sql);

    for (let i = 0; i < data.length; i++) {
      const transaction = data[i];
      const sender = await this.getUserInformation(transaction.user_id);
      const receiver = await this.getUserInformation(transaction.cr_wallet_id);
      data[i].sender = sender;
      data[i].receiver = receiver;
    }
    return this.makeResponse(200, 'Transaction report', data);
  }

  async getWalletReport(limit = 100, offset = 0, filters: any = {}) {
    let sql = 'SELECT * FROM sia_wallets';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Wallet report', data);
  }

  async getUserReport(limit = 100, offset = 0, filters: Partial<UserInput> = {}) {
    let sql = 'SELECT * FROM sia_users';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'User report', data);
  }

  async getSystemUserReport(limit = 100, offset = 0, filters: Partial<AdminUserInput> = {}) {
    let sql = 'SELECT * FROM admin_user';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'System user report', data);
  }

  async getCryptoDepositAddresses(limit = 100, offset = 0, filters: any = {}) {
    let sql = 'SELECT * FROM user_blockchain_addresses';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Crypto deposit addresses', data);
  }

  // --- SETTINGS: PAYMENT TYPE CRUD ---
  async getPaymentTypes(limit = 50, offset = 0, filters: Partial<PaymentTypeInput> = {}) {
    let sql = 'SELECT * FROM payment_types';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Payment types', data);
  }

  async createPaymentType(input: PaymentTypeInput) {
    try {
      const allowed: Partial<PaymentTypeInput> = (({ type, country, currency, operation, fee, fee_type, min_amount, max_amount, status }) => ({ type, country, currency, operation, fee, fee_type, min_amount, max_amount, status }))(input);
      const data = await this.insertData('payment_types', allowed);

      if (data === false) {
        return this.makeResponse(500, 'Failed to create payment type', null);
      }

      return this.makeResponse(200, 'Payment type created', data);
    } catch (error) {
      console.error('Error creating payment type:', error);
      return this.makeResponse(500, 'Error creating payment type', null);
    }
  }

  async updatePaymentType(id: string, input: Partial<PaymentTypeInput>) {
    try {
      // Only update fields that are actually provided
      const allowedFields = ['type', 'country', 'currency', 'operation', 'fee', 'fee_type', 'min_amount', 'max_amount', 'status'] as const;
      const updateData: Record<string, any> = {};

      Object.entries(input).forEach(([key, value]) => {
        if (allowedFields.includes(key as any) && value !== undefined) {
          updateData[key] = value;
        }
      });

      if (Object.keys(updateData).length === 0) {
        return this.makeResponse(400, 'No valid fields to update', null);
      }
      await this.updateData('payment_types', `id='${id}'`, updateData);
      return this.makeResponse(200, 'Payment type updated', true);
    } catch (error) {
      console.error('Error updating payment type:', error);
      return this.makeResponse(500, 'Failed to update payment type', null);
    }
  }

  async deletePaymentType(id: string) {
    try {
      await this.callQuery(`DELETE FROM payment_types WHERE id='${id}'`);
      return this.makeResponse(200, 'Payment type deleted', null);
    } catch (error) {
      console.error('Error deleting payment type:', error);
      return this.makeResponse(500, 'Failed to delete payment type', null);
    }
  }

  // --- ADMIN AUTHENTICATION ---
  async adminLogin(input: AdminLoginInput) {
    try {
      const { email, password } = input;

      // Get admin user
      const admins = await this.callQuery(`SELECT * FROM admin_user WHERE email='${email}' LIMIT 1`) as any[];

      if (!admins || admins.length === 0) {
        return this.makeResponse(401, 'Invalid credentials', null);
      }

      const admin = admins[0];

      // Verify password using bcrypt (all passwords should be hashed)
      const isPasswordValid = await bcrypt.compare(password, admin.password);

      if (!isPasswordValid) {
        return this.makeResponse(401, 'Invalid credentials', null);
      }

      // Generate JWT token

      const token = jwt.sign(
        {
          admin_id: admin.id,
          email: admin.email,
          username: admin.username,
          type: 'admin'
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return this.makeResponse(200, 'Admin login successful', {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name
        }
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return this.makeResponse(500, 'Login failed', null);
    }
  }

  // --- SETTINGS: CHANGE PASSWORD ---
  async changePassword(adminId: string, newPassword: string) {
    try {
      // Get admin user info first
      const adminUser = await this.callQuery(`SELECT * FROM admin_user WHERE id='${adminId}' LIMIT 1`) as any[];
      if (!adminUser || adminUser.length === 0) {
        return this.makeResponse(404, 'Admin user not found', null);
      }

      const admin = adminUser[0];

      // Hash password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.updateData('admin_user', `id='${adminId}'`, { password: hashedPassword });

      // Send password reset email
      await this.sendPasswordResetEmail(admin.email, admin.username, newPassword, admin.full_name);

      return this.makeResponse(200, 'Password changed successfully. Reset email sent.', true);
    } catch (error) {
      console.error('Error changing password:', error);
      return this.makeResponse(500, 'Failed to change password', null);
    }
  }

  // Initialize default admin user
  async initializeDefaultAdmin() {
    try {
      // Check if default admin already exists
      const existingAdmin = await this.callQuery(`SELECT * FROM admin_user WHERE email='admin@kitypay.com' LIMIT 1`) as any[];

      if (existingAdmin && existingAdmin.length > 0) {
        console.log('Default admin already exists');
        return this.makeResponse(200, 'Default admin already exists', null);
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash('admin', 10);

      // Create default admin user with hashed password
      const defaultAdmin = {
        username: 'admin',
        password: hashedPassword, // Hashed password
        email: 'admin@kitypay.com',
        full_name: 'Default Administrator'
      };

      const data = await this.insertData('admin_user', defaultAdmin);

      if (data === false) {
        return this.makeResponse(500, 'Failed to create default admin', null);
      }

      console.log('Default admin created successfully');
      return this.makeResponse(200, 'Default admin created successfully', {
        username: 'admin',
        password: 'admin', // Show plain text for user reference
        email: 'admin@kitypay.com'
      });
    } catch (error) {
      console.error('Error creating default admin:', error);
      return this.makeResponse(500, 'Error creating default admin', null);
    }
  }

  // Reset system user password and send email
  async resetSystemUserPassword(systemUserId: string) {
    try {
      // Get system user info first
      const systemUser = await this.callQuery(`SELECT * FROM admin_user WHERE id='${systemUserId}' LIMIT 1`) as any[];
      if (!systemUser || systemUser.length === 0) {
        return this.makeResponse(404, 'System user not found', null);
      }

      const userData = systemUser[0];

      // Generate new password
      const newPassword = this.generateRandomPassword();

      // Hash password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.updateData('admin_user', `id='${systemUserId}'`, { password: hashedPassword });

      // Send password reset email
      await this.sendPasswordResetEmail(userData.email, userData.username, newPassword, userData.full_name);

      return this.makeResponse(200, 'System user password reset successfully. Reset email sent.', {
        user_id: systemUserId,
        new_password: newPassword
      });
    } catch (error) {
      console.error('Error resetting system user password:', error);
      return this.makeResponse(500, 'Failed to reset system user password', null);
    }
  }

  // Reset user password and send email
  async resetUserPassword(userId: string) {
    try {
      // Get user info first
      const user = await this.callQuery(`SELECT * FROM sia_users WHERE user_id='${userId}' LIMIT 1`) as any[];
      if (!user || user.length === 0) {
        return this.makeResponse(404, 'User not found', null);
      }

      const userData = user[0];

      // Generate new password
      const newPassword = this.generateRandomPassword();

      // Hash password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.updateData('sia_users', `user_id='${userId}'`, { password: hashedPassword });

      // Send password reset email
      await this.sendPasswordResetEmail(userData.email, userData.username, newPassword, userData.full_name);

      return this.makeResponse(200, 'User password reset successfully. Reset email sent.', {
        user_id: userId,
        new_password: newPassword
      });
    } catch (error) {
      console.error('Error resetting user password:', error);
      return this.makeResponse(500, 'Failed to reset user password', null);
    }
  }

  // --- EXCHANGE RATES ---
  async getExchangeRates(limit = 100, offset = 0, filters: any = {}) {
    let sql = 'SELECT * FROM exchange_rates';
    const where: string[] = [];
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) where.push(`${key}='${value}'`);
    });
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const data = await this.callQuery(sql);
    return this.makeResponse(200, 'Exchange rates', data);
  }

  // --- SWEEP OPERATIONS ---
  async sweepFunds(input: any) {
    try {
      // This method would handle sweeping funds from user wallets to main wallet
      // Implementation depends on your business logic
      const { network, min_amount, sweep_type } = input;

      // Placeholder implementation - replace with actual sweep logic
      console.log('Sweep funds request:', input);

      // Example: Update wallet balances or create sweep transactions
      // const result = await this.callQuery(`UPDATE sia_wallets SET balance = balance - ${amount} WHERE id IN (${wallet_ids.join(',')})`);

      return this.makeResponse(200, 'Funds sweep initiated', {
        swept_amount: min_amount,
        wallet_count: network?.length || 0,
        sweep_type: sweep_type || 'manual'
      });
    } catch (error) {
      console.error('Error sweeping funds:', error);
      return this.makeResponse(500, 'Failed to sweep funds', null);
    }
  }

  async getSweepSettings() {
    try {
      // This method would return sweep configuration settings
      // You might have a sweep_settings table or return default settings

      // Placeholder implementation - replace with actual settings retrieval
      const settings = {
        auto_sweep_enabled: false,
        sweep_threshold: 1000,
        sweep_frequency: 'daily',
        sweep_currency: 'USD',
        sweep_wallet_id: null,
        last_sweep_date: null,
        sweep_fee_percentage: 0.5,
        sweep_addresses: [
          {
            name: 'Binance',
            purpose: 'Sweep',
            network: 'BSC',
            currency: 'USDC',
            address: '0xba6AdE92ed6Fa786D5EcCf5374F799316122C3db'
          },

          {
            name: 'Fees Wallet',
            purpose: 'fees',
            network: 'BSC',
            currency: 'USDC',
            address: '0xba6AdE92ed6Fa786D5EcCf5374F799316122C3db'
          },
        ]
      };

      return this.makeResponse(200, 'Sweep settings retrieved', settings);
    } catch (error) {
      console.error('Error getting sweep settings:', error);
      return this.makeResponse(500, 'Failed to get sweep settings', null);
    }
  }
}

export default new Admin(); 