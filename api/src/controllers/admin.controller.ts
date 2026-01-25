import { Request, Response } from 'express';
import Admin from '../models/Admin';

const adminController = {
  // --- USER CRUD ---
  async getUsers(req: Request, res: Response) {
    const users = await Admin.getUsers();
    res.json(users);
  },
  async getUserById(req: Request, res: Response) {
    const user = await Admin.getUserById(req.params.id);
    res.json(user);
  },
  async createUser(req: Request, res: Response) {
    const result = await Admin.createUser(req.body);
    res.json(result);
  },
  async updateUser(req: Request, res: Response) {
    const result = await Admin.updateUser(req.params.id, req.body);
    res.json(result);
  },
  async deleteUser(req: Request, res: Response) {
    const result = await Admin.deleteUser(req.params.id);
    res.json(result);
  },
  async getUserTransactions(req: Request, res: Response) {
    const txs = await Admin.getUserTransactions(req.params.id);
    res.json(txs);
  },
  async getUserBalances(req: Request, res: Response) {
    const balances = await Admin.getUserBalances(req.params.id);
    res.json(balances);
  },

  // --- SYSTEM USER CRUD ---
  async getSystemUsers(req: Request, res: Response) {
    const users = await Admin.getSystemUsers();
    res.json(users);
  },
  async getSystemUserById(req: Request, res: Response) {
    const user = await Admin.getSystemUserById(req.params.id);
    res.json(user);
  },
  async createSystemUser(req: Request, res: Response) {
    const result = await Admin.createSystemUser(req.body);
    res.json(result);
  },
  async updateSystemUser(req: Request, res: Response) {
    const result = await Admin.updateSystemUser(req.params.id, req.body);
    res.json(result);
  },
  async deleteSystemUser(req: Request, res: Response) {
    const result = await Admin.deleteSystemUser(req.params.id, req.admin?.admin_id);
    res.json(result);
  },

  // --- WALLET MANAGEMENT ---
  async getWallets(req: Request, res: Response) {
    const wallets = await Admin.getWallets();
    res.json(wallets);
  },
  async getWalletById(req: Request, res: Response) {
    const wallet = await Admin.getWalletById(req.params.id);
    res.json(wallet);
  },
  async deactivateWallet(req: Request, res: Response) {
    const result = await Admin.deactivateWallet(req.params.id);
    res.json(result);
  },

  // --- REPORTS ---
  async getTransactionReport(req: Request, res: Response) {
    const report = await Admin.getTransactionReport();
    res.json(report);
  },
  async getWalletReport(req: Request, res: Response) {
    const report = await Admin.getWalletReport();
    res.json(report);
  },
  async getUserReport(req: Request, res: Response) {
    const report = await Admin.getUserReport();
    res.json(report);
  },
  async getSystemUserReport(req: Request, res: Response) {
    const report = await Admin.getSystemUserReport();
    res.json(report);
  },
  async getCryptoDepositAddresses(req: Request, res: Response) {
    const addresses = await Admin.getCryptoDepositAddresses();
    res.json(addresses);
  },

  // --- SETTINGS: PAYMENT TYPE CRUD ---
  async getPaymentTypes(req: Request, res: Response) {
    const types = await Admin.getPaymentTypes();
    res.json(types);
  },
  async createPaymentType(req: Request, res: Response) {
    const result = await Admin.createPaymentType(req.body);
    res.json(result);
  },
  async updatePaymentType(req: Request, res: Response) {
    const result = await Admin.updatePaymentType(req.params.id, req.body);
    res.json(result);
  },
  async deletePaymentType(req: Request, res: Response) {
    const result = await Admin.deletePaymentType(req.params.id);
    res.json(result);
  },

  // --- ADMIN AUTHENTICATION ---
  async adminLogin(req: Request, res: Response) {
    const result = await Admin.adminLogin(req.body);
    res.json(result);
  },

  // --- SETTINGS: CHANGE PASSWORD ---
  async changePassword(req: Request, res: Response) {
    const { newPassword } = req.body;
    const adminId = req.admin?.admin_id;
    if (!adminId) {
      return res.status(401).json({
        status: 401,
        message: 'Admin not authenticated',
        data: null
      });
    }
    const result = await Admin.changePassword(adminId, newPassword);
    res.json(result);
  },
  async resetUserPassword(req: Request, res: Response) {
    const result = await Admin.resetUserPassword(req.params.id);
    res.json(result);
  },
  async resetSystemUserPassword(req: Request, res: Response) {
    const result = await Admin.resetSystemUserPassword(req.params.id);
    res.json(result);
  },

  // --- EXCHANGE RATES ---
  async getExchangeRates(req: Request, res: Response) {
    const rates = await Admin.getExchangeRates();
    res.json(rates);
  },

  // --- SWEEP OPERATIONS ---
  async sweepFunds(req: Request, res: Response) {
    const result = await Admin.sweepFunds(req.body);
    res.json(result);
  },
  async getSweepSettings(req: Request, res: Response) {
    const settings = await Admin.getSweepSettings();
    res.json(settings);
  },

  // --- INITIALIZATION ---
  async initializeDefaultAdmin(req: Request, res: Response) {
    const result = await Admin.initializeDefaultAdmin();
    res.json(result);
  },
};

export default adminController; 